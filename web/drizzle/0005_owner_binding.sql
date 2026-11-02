CREATE TABLE "owner_binding" (
	"slot" text PRIMARY KEY DEFAULT 'owner' NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_binding_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "owner_binding_single_slot" CHECK ("owner_binding"."slot" = 'owner')
);
--> statement-breakpoint
ALTER TABLE "owner_binding" ADD CONSTRAINT "owner_binding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;