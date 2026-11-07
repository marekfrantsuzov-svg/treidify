import sys, sherpa_onnx, soundfile as sf, numpy as np
d = "/home/user/tts/sherpa-onnx-whisper-base.en/"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=d+"base.en-encoder.int8.onnx", decoder=d+"base.en-decoder.int8.onnx", tokens=d+"base.en-tokens.txt", num_threads=4)
x, sr = sf.read(sys.argv[1], dtype="float32")
if x.ndim > 1: x = x.mean(1)
if sr != 16000:
    from scipy.signal import resample_poly; x = resample_poly(x, 16000, sr).astype("float32"); sr = 16000
# chunk on 25 s windows (whisper limit 30 s) with timestamps
step = int(sr * float(sys.argv[2]) if len(sys.argv) > 2 else sr * 5)
for a in range(0, len(x), step):
    s = rec.create_stream(); s.accept_waveform(sr, x[a:a+step]); rec.decode_stream(s)
    print(f"{a/sr:6.1f}s  {s.result.text.strip()}")
