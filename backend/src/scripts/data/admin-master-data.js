// Sample master data for `npm run seed:admin`, from the Admin master data design.

export const petTypes = [
 { code: "PET-DOG", name: "Chó", description: "Thức ăn, đồ chơi và phụ kiện cho chó" },
 { code: "PET-CAT", name: "Mèo", description: "Thức ăn, cát vệ sinh và phụ kiện cho mèo" },
 { code: "PET-BIRD", name: "Chim", description: "Thức ăn hạt và phụ kiện lồng chim" },
 { code: "PET-HAM", name: "Hamster", description: "Thức ăn và vật dụng cho thú nhỏ" },
 { code: "PET-FISH", name: "Cá cảnh", description: "Thức ăn và phụ kiện thủy sinh", isActive: false },
];

export const breedsByPetType = {
 "PET-DOG": ["Poodle", "Corgi", "Golden Retriever", "Husky", "Shiba Inu", "Chihuahua", "Pug", "Phốc sóc", "Alaska", "Becgie Đức", "Bulldog Pháp", "Labrador"],
 "PET-CAT": ["Mèo Anh lông ngắn", "Mèo Ba Tư", "Mèo Xiêm", "Mèo Ragdoll", "Mèo Scottish Fold", "Mèo Maine Coon", "Mèo Munchkin", "Mèo ta"],
 "PET-BIRD": ["Vẹt", "Chào mào"],
 "PET-HAM": ["Hamster Bear", "Hamster Robo"],
};

export const units = [
 { name: "Túi", description: "Thức ăn hạt đóng gói" },
 { name: "Hộp", description: "Pate, bánh thưởng đóng hộp" },
 { name: "Cái", description: "Đồ chơi, phụ kiện bán lẻ" },
 { name: "Gói", description: "Pate gói, súp thưởng" },
 { name: "Bao", description: "Cát vệ sinh khối lượng lớn" },
 { name: "Chai", description: "Sữa tắm, dung dịch chăm sóc" },
];

export const shippingMethods = [
 { code: "SHIP-STD", name: "Giao hàng tiêu chuẩn", description: "Giao trong 2–4 ngày làm việc", fee: 30000 },
 { code: "SHIP-EXP", name: "Giao hàng hỏa tốc", description: "Nội thành TP. Hồ Chí Minh", fee: 45000 },
 { code: "SHIP-PICK", name: "Nhận tại cửa hàng", description: "28 Nguyễn Thị Minh Khai, Quận 1", fee: 0 },
];

export const brandOrigins = {
 "Royal Canin": "Pháp · Thức ăn theo giống và độ tuổi",
 Catsan: "Đức · Cát vệ sinh cho mèo",
 KONG: "Mỹ · Đồ chơi cao su bền",
 Petkit: "Trung Quốc · Phụ kiện thông minh",
 Whiskas: "Thái Lan · Pate và hạt cho mèo",
 Pedigree: "Thái Lan · Thức ăn cho chó",
 SmartHeart: "Thái Lan · Thức ăn cho chó",
 Trixie: "Đức · Phụ kiện và đồ chơi",
 "Me-O": "Thái Lan · Thức ăn cho mèo",
 "Cat's Best": "Đức · Cát hữu cơ",
 "Bio-Groom": "Mỹ · Sữa tắm và chăm sóc lông",
 Virbac: "Pháp · Thuốc và vitamin thú y",
};
