import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MetaApiError, type MetaAccountInfo, type MetaApiClient, type MetaDeal, type MetaPosition } from "./metaapi";

/**
 * End-to-end sync behaviour against a real Postgres (DATABASE_URL) with a scripted MetaApi. Proves: owner/normal
 * credential rules, refusal of master or unconfirmed passwords BEFORE any data is stored, broker errors, disconnect,
 * delete, multiple accounts and limits, cross-user isolation, and P&L/history maths with dedupe.
 * No real credentials are used anywhere.
 */
const run = process.env.DATABASE_URL ? describe : describe.skip;

interface FakeAccount { name: string; login: string; password: string; server: string; investorMode: boolean | undefined; info: MetaAccountInfo; positions: MetaPosition[]; deals: MetaDeal[] }

function fakeMetaApi() {
  const brokers: Record<string, { login: string; master: string; investor: string }[]> = {
    "Demo-Server": [{ login: "1001", master: "Master#1", investor: "Investor#1" }, { login: "1002", master: "Master#2", investor: "Investor#2" }, { login: "1003", master: "Master#3", investor: "Investor#3" }, { login: "1004", master: "Master#4", investor: "Investor#4" }, { login: "1005", master: "Master#5", investor: "Investor#5" }],
  };
  const accounts = new Map<string, FakeAccount>();
  const removed: string[] = [];
  const calls: string[] = [];
  const control = { historyDown: false };
  let seq = 0;
  // Regional calls only answer on the account's real region, like MetaApi's regional hosts.
  const at = (region: string) => { if (region !== "london") throw new MetaApiError("no answer within 15 s", 504); };
  const get = (id: string) => { const a = accounts.get(id); if (!a) throw new MetaApiError("Not found", 404); return a; };
  const api: MetaApiClient = {
    vendor: "metaapi",
    async createAccount(a) {
      calls.push("createAccount");
      const srv = brokers[a.server];
      if (!srv) throw new MetaApiError("Server file not found", 400, undefined, "E_SRV_NOT_FOUND", ["Demo-Server"]);
      const acct = srv.find((x) => x.login === a.login);
      const mode = acct?.investor === a.password ? true : acct?.master === a.password ? false : null;
      if (mode === null) throw new MetaApiError("Authentication failed", 400, undefined, "E_AUTH");
      const id = `acc${++seq}`;
      accounts.set(id, {
        name: a.name, login: a.login, password: a.password, server: a.server, investorMode: mode,
        info: { broker: "Demo Broker Ltd", currency: "USD", balance: 10_000, equity: 10_050, margin: 200, freeMargin: 9_850, investorMode: mode, tradeAllowed: !mode },
        positions: [{ id: "77", type: "POSITION_TYPE_BUY", symbol: "XAUUSD", openPrice: 4000, currentPrice: 4005, volume: 0.1, profit: 50, time: "2026-11-02T08:00:00Z", stopLoss: 3995, takeProfit: 4020 }],
        deals: [
          { id: "d0", type: "DEAL_TYPE_BALANCE", profit: 10_000, time: "2026-10-01T00:00:00Z" },
          { id: "d1", type: "DEAL_TYPE_BUY", entryType: "DEAL_ENTRY_IN", symbol: "XAUUSD", volume: 0.5, price: 4000, commission: -3.5, positionId: "P1", time: "2026-10-05T09:00:00Z" },
          { id: "d2", type: "DEAL_TYPE_SELL", entryType: "DEAL_ENTRY_OUT", symbol: "XAUUSD", volume: 0.5, price: 4004, profit: 200, commission: -3.5, swap: -1, positionId: "P1", time: "2026-10-05T12:00:00Z", stopLoss: 3995, takeProfit: 4004 },
          { id: "d3", type: "DEAL_TYPE_SELL", entryType: "DEAL_ENTRY_IN", symbol: "EURUSD", volume: 1, price: 1.1, commission: -7, positionId: "P2", time: "2026-10-06T09:00:00Z" },
          { id: "d4", type: "DEAL_TYPE_BUY", entryType: "DEAL_ENTRY_OUT", symbol: "EURUSD", volume: 1, price: 1.101, profit: -100, positionId: "P2", time: "2026-10-06T10:00:00Z" },
        ],
      });
      return { id, state: "DEPLOYED" };
    },
    async account(id) { calls.push("account"); get(id); return { _id: id, state: "DEPLOYED", connectionStatus: "CONNECTED", region: "london" }; },
    async deploy() { calls.push("deploy"); },
    async probe() { calls.push("probe"); return []; },
    async list() { calls.push("list"); return [...accounts].map(([id, x]) => ({ _id: id, name: x.name, login: x.login, server: x.server, platform: "mt5", state: "DEPLOYED", connectionStatus: "CONNECTED", region: "london" })); },
    async remove(id) { calls.push("remove"); removed.push(id); accounts.delete(id); },
    async info(r, id) { calls.push("info"); at(r); return get(id).info; },
    async positions(r, id) { calls.push("positions"); at(r); return get(id).positions; },
    async orders() { calls.push("orders"); return []; },
    async deals(r, id, from, to) {
      calls.push("deals"); at(r);
      if (control.historyDown) throw new MetaApiError("TimeoutError: history not ready", 504);
      return get(id).deals.filter((d) => { const t = Date.parse(d.time); return t >= from.getTime() && t <= to.getTime(); });
    },
  };
  return { api, accounts, removed, calls, control };
}

run("MetaApi sync (database)", () => {
  type Svc = typeof import("./service");
  let svc: Svc;
  let db: typeof import("../db")["db"], schema: typeof import("../db")["schema"];
  let fake: ReturnType<typeof fakeMetaApi>;
  // The owner mailbox is a test Gmail address (server override), so the Gmail alias rules are exercised too.
  const OWNER = { id: "test_owner", email: "treidify.owner.test@gmail.com", emailVerified: true };
  const TWIN = { id: "test_twin", email: "treidifyownertest+2@gmail.com", emailVerified: true }; // same inbox, other account
  const ALICE = { id: "test_alice", email: "alice@test.local", emailVerified: true };
  const BOB = { id: "test_bob", email: "bob@test.local", emailVerified: true };
  const ids = [OWNER.id, ALICE.id, BOB.id, TWIN.id];
  const conn = async (accountId: string) => (await db.select().from(schema.providerConnection).where((await import("drizzle-orm")).eq(schema.providerConnection.tradingAccountId, accountId)))[0]!;

  beforeAll(async () => {
    vi.stubEnv("METAAPI_TOKEN", "test-token");
    vi.stubEnv("TREIDIFY_OWNER_USER_ID", "");
    vi.stubEnv("TREIDIFY_OWNER_EMAIL", OWNER.email);
    vi.stubEnv("METAAPI_MAX_ACCOUNTS_PER_USER", "2");
    vi.stubEnv("METAAPI_MAX_ACCOUNTS", "50");
    ({ db, schema } = await import("../db"));
    svc = await import("./service");
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.user).where(inArray(schema.user.id, ids));
    await db.insert(schema.user).values([OWNER, ALICE, BOB, TWIN].map((u) => ({ ...u, name: u.id })));
  });
  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.user).where(inArray(schema.user.id, ids));
    svc._setMetaApiClient(null);
    vi.unstubAllEnvs();
  });
  beforeEach(async () => {
    fake = fakeMetaApi();
    svc._setMetaApiClient(fake.api);
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.tradingAccount).where(inArray(schema.tradingAccount.userId, ids));
    await db.delete(schema.ownerBinding).where(inArray(schema.ownerBinding.userId, ids));
  });

  const connect = (u: typeof ALICE, login: string, password: string, credential: "investor" | "master" = "investor", server = "Demo-Server") =>
    svc.createConnection(u, { platform: "mt5", server, login, password, credential });
  const syncOf = async (accountId: string) => svc.syncConnection((await conn(accountId)).id);

  it("normal user with the investor password: verified read-only, real data imported", async () => {
    const r = await connect(ALICE, "1001", "Investor#1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await syncOf(r.accountId);
    expect(s).toEqual({ ok: true, phase: "synced" });
    const c = await conn(r.accountId);
    expect(c).toMatchObject({ status: "connected", accessMode: "investor", credential: "investor", secretCiphertext: null });
    expect(c.externalId).toMatch(/^london:acc\d+$/);
    const { eq } = await import("drizzle-orm");
    const [snap] = await db.select().from(schema.accountSnapshot).where(eq(schema.accountSnapshot.tradingAccountId, r.accountId));
    expect(snap).toMatchObject({ balance: 10_000, equity: 10_050, floatingPnl: 50 });
    const trades = await db.select().from(schema.closedTrade).where(eq(schema.closedTrade.tradingAccountId, r.accountId));
    expect(trades.map((t) => [t.positionId, t.profit + t.commission + t.swap + t.fee]).sort()).toEqual([["P1", 192], ["P2", -107]]);
    expect(trades.find((t) => t.positionId === "P1")).toMatchObject({ stopLoss: 3995, takeProfit: 4004, openPrice: 4000, closePrice: 4004, volume: 0.5 });
    const flows = await db.select().from(schema.cashFlow).where(eq(schema.cashFlow.tradingAccountId, r.accountId));
    expect(flows.map((f) => [f.kind, f.amount])).toEqual([["deposit", 10_000]]);
    // Re-syncing never duplicates deals or trades.
    expect((await syncOf(r.accountId)).ok).toBe(true);
    expect(await db.select().from(schema.deal).where(eq(schema.deal.tradingAccountId, r.accountId))).toHaveLength(5);
    expect(await db.select().from(schema.closedTrade).where(eq(schema.closedTrade.tradingAccountId, r.accountId))).toHaveLength(2);
  });

  it("normal user is refused a master password before anything is sent", async () => {
    const r = await connect(ALICE, "1001", "Master#1", "master");
    expect(r).toMatchObject({ ok: false, code: "credential" });
    expect(fake.calls).toEqual([]);
  });

  it("normal user who types the master password into the investor field: removed at MetaApi, nothing stored", async () => {
    const r = await connect(ALICE, "1002", "Master#2", "investor");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await syncOf(r.accountId);
    expect(s).toMatchObject({ ok: false, phase: "refused" });
    expect(fake.removed).toHaveLength(1);
    expect(fake.calls).not.toContain("deals");
    const c = await conn(r.accountId);
    expect(c).toMatchObject({ status: "error", externalId: null, accessMode: null });
    expect(c.lastError).toMatch(/master/);
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(schema.accountSnapshot).where(eq(schema.accountSnapshot.tradingAccountId, r.accountId))).toHaveLength(0);
    expect(await db.select().from(schema.deal).where(eq(schema.deal.tradingAccountId, r.accountId))).toHaveLength(0);
  });

  it("refuses when MetaApi cannot confirm investor mode", async () => {
    const r = await connect(ALICE, "1003", "Investor#3");
    if (!r.ok) throw new Error("expected ok");
    for (const a of fake.accounts.values()) a.info = { ...a.info, investorMode: undefined };
    expect(await syncOf(r.accountId)).toMatchObject({ ok: false, phase: "refused" });
    expect((await conn(r.accountId)).lastError).toMatch(/could not confirm/);
  });

  it("owner may connect with the master password (labelled master), Treidify still only reads", async () => {
    const r = await connect(OWNER, "1004", "Master#4", "master");
    if (!r.ok) throw new Error(r.error);
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
    expect(await conn(r.accountId)).toMatchObject({ accessMode: "master", credential: "master", status: "connected" });
  });

  it("an unverified owner email does not get owner rights and cannot claim the owner slot", async () => {
    const { eq } = await import("drizzle-orm");
    const ob = await import("../owner-binding");
    await db.update(schema.user).set({ emailVerified: false }).where(eq(schema.user.id, OWNER.id));
    try {
      const r = await connect({ ...OWNER, emailVerified: false }, "1004", "Master#4", "master");
      expect(r).toMatchObject({ ok: false, code: "credential" });
      expect((await ob.ownerForUserId(OWNER.id)).owner).toBe(false);
      expect(await ob.boundOwnerId()).toBeNull();
    } finally {
      await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, OWNER.id));
    }
  });

  it("owner role binds automatically to one immutable user ID; nobody else can take or share it", async () => {
    const ob = await import("../owner-binding");
    // Normal users are never the owner and never bind the slot.
    expect((await ob.ownerForUserId(ALICE.id)).owner).toBe(false);
    expect(await ob.boundOwnerId()).toBeNull();
    // An admin impersonating the owner gets no owner rights and binds nothing.
    expect((await ob.ownerForUserId(OWNER.id, { impersonatedBy: "some_admin" })).owner).toBe(false);
    expect(await ob.boundOwnerId()).toBeNull();
    // Two verified accounts on the same inbox race: exactly one wins, enforced by the database.
    const [a, b] = await Promise.all([ob.ownerForUserId(OWNER.id), ob.ownerForUserId(TWIN.id)]);
    expect([a.owner, b.owner].filter(Boolean)).toHaveLength(1);
    const winner = a.owner ? OWNER : TWIN, loser = a.owner ? TWIN : OWNER;
    expect(await ob.boundOwnerId()).toBe(winner.id);
    // The loser stays a normal user: master refused before anything is sent.
    expect(await connect(loser, "1004", "Master#4", "master")).toMatchObject({ ok: false, code: "credential" });
    expect(fake.calls).not.toContain("createAccount");
    // The slot is a single row: a second binding is impossible at the database level.
    await expect(db.insert(schema.ownerBinding).values({ slot: "owner", userId: loser.id, email: loser.email })).rejects.toThrow();
    await expect(db.insert(schema.ownerBinding).values({ slot: "owner2", userId: loser.id, email: loser.email })).rejects.toThrow();
    expect((await ob.ownerForUserId(winner.id)).owner).toBe(true);
  });

  it("a connection an interrupted request left at MetaApi is picked up, not duplicated, and only by the same user", async () => {
    // Simulate a connect that MetaApi completed after Treidify's request had already timed out.
    const orphan = await fake.api.createAccount({ platform: "mt5", server: "Demo-Server", login: "1001", password: "Investor#1", name: `treidify-${ALICE.id.slice(0, 8)}-1001`, transactionId: "t0" });
    fake.calls.length = 0;
    // Another user with the same login cannot take it over: a fresh MetaApi account is created for them.
    const b = await connect(BOB, "1001", "Investor#1");
    if (!b.ok) throw new Error(b.error);
    expect(fake.calls).toContain("createAccount");
    expect((await conn(b.accountId)).externalId).not.toContain(orphan.id);
    fake.calls.length = 0;
    const r = await connect(ALICE, "1001", "Investor#1");
    if (!r.ok) throw new Error(r.error);
    expect(fake.calls).not.toContain("createAccount");
    expect((await conn(r.accountId)).externalId).toBe(`london:${orphan.id}`);
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
  });

  it("corrects a wrong stored region from MetaApi before any regional call", async () => {
    const r = await connect(ALICE, "1002", "Investor#2");
    if (!r.ok) throw new Error(r.error);
    const c = await conn(r.accountId);
    const { eq } = await import("drizzle-orm");
    const wrong = c.externalId!.replace(/^london:/, "new-york:");
    await db.update(schema.providerConnection).set({ externalId: wrong }).where(eq(schema.providerConnection.id, c.id));
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
    expect((await conn(r.accountId)).externalId).toMatch(/^london:/);
  });

  it("slow history never blocks the account: live data shows as connected, history follows on the next sync", async () => {
    const r = await connect(ALICE, "1003", "Investor#3");
    if (!r.ok) throw new Error(r.error);
    fake.control.historyDown = true;
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
    const { eq } = await import("drizzle-orm");
    let c = await conn(r.accountId);
    expect(c.status).toBe("connected");
    expect(c.lastSyncAt).toBeNull();
    const [snap] = await db.select().from(schema.accountSnapshot).where(eq(schema.accountSnapshot.tradingAccountId, r.accountId));
    expect(snap).toMatchObject({ balance: 10_000, equity: 10_050 });
    expect(await db.select().from(schema.closedTrade).where(eq(schema.closedTrade.tradingAccountId, r.accountId))).toHaveLength(0);
    fake.control.historyDown = false;
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
    c = await conn(r.accountId);
    expect(c.lastSyncAt).not.toBeNull();
    expect(c.historyCursor!.getTime()).toBe(c.historyFrom!.getTime());
    expect(await db.select().from(schema.closedTrade).where(eq(schema.closedTrade.tradingAccountId, r.accountId))).toHaveLength(2);
    expect(fake.calls.filter((x) => x === "deals").length).toBeGreaterThan(2); // recent window + backfill chunks
  });

  it("without a cron secret, a background sync heals an errored connection, at most once every 10 minutes", async () => {
    const r = await connect(ALICE, "1005", "Investor#5");
    if (!r.ok) throw new Error(r.error);
    const { eq } = await import("drizzle-orm");
    const c0 = await conn(r.accountId);
    await db.update(schema.providerConnection).set({ status: "error", lastSyncAt: null, lastError: "MetaApi: no answer within 15 s" }).where(eq(schema.providerConnection.id, c0.id));
    await db.delete(schema.auditLog).where(eq(schema.auditLog.action, "sync.background"));
    expect(await svc.backgroundSync()).toEqual({ ok: true, phase: "synced" });
    const c = await conn(r.accountId);
    expect(c.status).toBe("connected");
    expect(c.lastError).toBeNull();
    expect(c.lastSyncAt).not.toBeNull();
    await db.update(schema.providerConnection).set({ lastSyncAt: null }).where(eq(schema.providerConnection.id, c0.id));
    expect(await svc.backgroundSync()).toBeNull(); // slot already taken
    await db.delete(schema.auditLog).where(eq(schema.auditLog.action, "sync.background"));
  });

  it("runs one sync per connection at a time", async () => {
    const r = await connect(ALICE, "1004", "Investor#4");
    if (!r.ok) throw new Error(r.error);
    const c = await conn(r.accountId);
    await db.insert(schema.syncRun).values({ connectionId: c.id, kind: "backfill" });
    expect(await syncOf(r.accountId)).toMatchObject({ ok: false, error: "A sync is already running." });
    const { eq } = await import("drizzle-orm");
    await db.update(schema.syncRun).set({ finishedAt: new Date() }).where(eq(schema.syncRun.connectionId, c.id));
    expect(await syncOf(r.accountId)).toEqual({ ok: true, phase: "synced" });
  });

  it("wrong password and wrong server are reported by code and store nothing", async () => {
    const e1 = await connect(ALICE, "1001", "wrong").catch((e) => e);
    expect(e1).toMatchObject({ code: "E_AUTH" });
    const e2 = await connect(ALICE, "1001", "Investor#1", "investor", "Nope-Server").catch((e) => e);
    expect(e2).toMatchObject({ code: "E_SRV_NOT_FOUND", serverNames: ["Demo-Server"] });
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(schema.tradingAccount).where(eq(schema.tradingAccount.userId, ALICE.id))).toHaveLength(0);
  });

  it("multiple accounts per user, per-user limit, disconnect frees a slot, delete removes data", async () => {
    const a = await connect(ALICE, "1001", "Investor#1");
    const b = await connect(ALICE, "1002", "Investor#2");
    expect(a.ok && b.ok).toBe(true);
    const c = await connect(ALICE, "1003", "Investor#3");
    expect(c).toMatchObject({ ok: false, code: "limit" });
    if (!a.ok || !b.ok) return;
    await syncOf(a.accountId); await syncOf(b.accountId);
    expect(await svc.revokeConnection(ALICE.id, a.accountId)).toEqual({ ok: true });
    expect(await conn(a.accountId)).toMatchObject({ status: "disconnected", externalId: null });
    expect(fake.removed).toHaveLength(1);
    expect((await connect(ALICE, "1003", "Investor#3")).ok).toBe(true);
    expect(await svc.deleteConnectedAccount(ALICE.id, b.accountId)).toEqual({ ok: true });
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(schema.tradingAccount).where(eq(schema.tradingAccount.id, b.accountId))).toHaveLength(0);
    expect(await db.select().from(schema.deal).where(eq(schema.deal.tradingAccountId, b.accountId))).toHaveLength(0);
  });

  it("reconnecting the same login reuses the account and keeps history without duplicates", async () => {
    const a = await connect(ALICE, "1001", "Investor#1");
    if (!a.ok) throw new Error();
    await syncOf(a.accountId);
    await svc.revokeConnection(ALICE.id, a.accountId);
    const again = await connect(ALICE, "1001", "Investor#1");
    expect(again).toMatchObject({ ok: true, reconnected: true, accountId: a.accountId });
    await syncOf(a.accountId);
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(schema.closedTrade).where(eq(schema.closedTrade.tradingAccountId, a.accountId))).toHaveLength(2);
  });

  it("isolates users: nobody can read, refresh, sync, disconnect or delete another user's account", async () => {
    const a = await connect(ALICE, "1001", "Investor#1");
    if (!a.ok) throw new Error();
    await syncOf(a.accountId);
    expect(await svc.ownedConnection(BOB.id, a.accountId)).toBeNull();
    expect(await svc.liveRefresh(BOB.id, a.accountId)).toBeNull();
    expect(await svc.revokeConnection(BOB.id, a.accountId)).toMatchObject({ ok: false });
    expect(await svc.deleteConnectedAccount(BOB.id, a.accountId)).toMatchObject({ ok: false });
    const { listAccounts } = await import("../account-data");
    expect(await listAccounts(BOB.id)).toEqual([]);
    expect((await listAccounts(ALICE.id)).map((x) => x.id)).toEqual([a.accountId]);
    expect(await conn(a.accountId)).toMatchObject({ status: "connected" });
  });

  it("live refresh updates balance/equity/positions at most every 20 s and re-checks access", async () => {
    const a = await connect(ALICE, "1001", "Investor#1");
    if (!a.ok) throw new Error();
    await syncOf(a.accountId);
    const t0 = new Date(Date.now() + 60_000);
    for (const x of fake.accounts.values()) { x.info = { ...x.info, balance: 10_100, equity: 10_180 }; x.positions = []; }
    const l1 = await svc.liveRefresh(ALICE.id, a.accountId, t0);
    expect(l1).toMatchObject({ balance: 10_100, equity: 10_180, positions: [], accessMode: "investor" });
    const infoCalls = fake.calls.filter((c) => c === "info").length;
    await svc.liveRefresh(ALICE.id, a.accountId, new Date(t0.getTime() + 5_000));
    expect(fake.calls.filter((c) => c === "info").length).toBe(infoCalls); // throttled
    // If the account stops reporting investor mode, the live refresh removes it.
    for (const x of fake.accounts.values()) x.info = { ...x.info, investorMode: false };
    const l3 = await svc.liveRefresh(ALICE.id, a.accountId, new Date(t0.getTime() + 30_000));
    expect(l3?.error).toMatch(/master/);
    expect(await conn(a.accountId)).toMatchObject({ externalId: null, status: "error" });
  });
});
