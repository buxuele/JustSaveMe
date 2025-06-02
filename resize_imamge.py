from PIL import Image
import os

# 先找1张图片
# 目的  调整图片大小。做 Chrome 插件的时候，需要用到图标。
def resize_image(input_name, out_name, out_width, out_height):
    img = Image.open(input_name)
    out = img.resize((out_width, out_height))
    out_path = os.path.join("./images", out_name)
    out.save(out_path)


# 插件激活状态的图标
input_image = "g1.jpg"  # "g1.jpg"  "g1.png"
for i in [16, 48, 128]:
    out_image = f"icon{i}_active.png"
    resize_image(input_image, out_image, i, i)

print("Done!")
