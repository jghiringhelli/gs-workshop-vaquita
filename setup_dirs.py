import os

base = r'C:\Solera\WorkShop\IA WorkShop\gs-workshop-vaquita'
dirs = [
    'src/config',
    'src/db',
    'src/errors',
    'src/middleware',
    'src/modules/users',
    'src/modules/tandas',
    'src/test'
]

# Create directories
for d in dirs:
    full_path = os.path.join(base, d)
    os.makedirs(full_path, exist_ok=True)
    print(f"Created/verified: {full_path}")

print("\nDirectory structure:")
for root, dirs_list, files in os.walk(os.path.join(base, 'src')):
    print(root)
