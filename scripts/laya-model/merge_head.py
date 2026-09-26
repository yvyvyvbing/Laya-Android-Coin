"""Merge head.onnx external data (head.onnx.data) into a single head.onnx."""
import os
import onnx

src = "model/head.onnx"
dst = "model-int8/head.onnx"

m = onnx.load(src, load_external_data=True)
onnx.save(m, dst)

print("merged head size MB: %.1f" % (os.path.getsize(dst) / (1024 * 1024)))
