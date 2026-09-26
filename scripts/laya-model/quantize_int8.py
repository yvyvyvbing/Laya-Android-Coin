"""Int8 dynamic quantization for exported Laya ONNX models.

Encoder (the bulk of the model) is dynamically quantized to int8. The small
decision head (~57 MB) is copied as FP32, because its dynamic marker axis
makes onnxruntime's shape-inference pre-pass fail. Tokenizer + config copied.

Usage:
    python quantize_int8.py --in-dir ./model --out-dir ./model-int8
"""
import argparse
import os
import shutil

from onnxruntime.quantization import quantize_dynamic, QuantType


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--in-dir", default="./model")
    p.add_argument("--out-dir", default="./model-int8")
    args = p.parse_args()

    in_dir = args.in_dir
    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)

    print("quantizing encoder ...")
    quantize_dynamic(
        model_input=os.path.join(in_dir, "encoder.onnx"),
        model_output=os.path.join(out_dir, "encoder.onnx"),
        weight_type=QuantType.QInt8,
        per_channel=True,
        reduce_range=False,
    )

    print("copying head (FP32) ...")
    for fname in ("head.onnx", "head.onnx.data"):
        src = os.path.join(in_dir, fname)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(out_dir, fname))

    print("copying tokenizer + config ...")
    for name in ("tokenizer.json", "rl_agent_config.json"):
        src = os.path.join(in_dir, name)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(out_dir, name))

    print("done -> " + out_dir)


if __name__ == "__main__":
    main()
