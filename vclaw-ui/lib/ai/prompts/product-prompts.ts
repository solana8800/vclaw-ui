/**
 * Prompts liên quan đến quản lý sản phẩm (bóc tách thông tin, sinh nội dung marketing)
 */

export const PRODUCT_EXTRACTION_PROMPT = (urls: string) => `Hãy đóng vai một chuyên gia kiểm kê hàng hóa. 
PHÂN TÍCH hình ảnh tại URL: ${urls}.
YÊU CẦU:
1. Trích xuất thông tin THỰC TẾ từ hình ảnh (Tên, giá, mô tả, danh mục).
2. TUYỆT ĐỐI KHÔNG sử dụng thông tin mẫu hoặc dữ liệu 'Cà phê Arabica' nếu hình ảnh không phải là cà phê.
3. Nếu không nhìn rõ thông tin, hãy dựa vào hình dáng sản phẩm để đưa ra phỏng đoán chính xác nhất.
4. Trả về JSON: { "name": "...", "price": 0, "description": "...", "category": "..." }. 
Lưu ý: Ngôn ngữ tiếng Việt, giá trị price là số (mặc định 0 nếu không thấy).`;

export const PRODUCT_MARKETING_PROMPT = (productName: string, description: string) => `Hãy viết một đoạn nội dung marketing (khoảng 50-80 từ) cực kỳ hấp dẫn, sáng tạo và thu hút để đăng bài bán hàng cho sản phẩm "${productName}". 
Mô tả sản phẩm: ${description}. 
Yêu cầu: Sử dụng ngôn ngữ trẻ trung, kèm các emoji phù hợp, có lời kêu gọi hành động (CTA) rõ ràng. Chỉ trả về nội dung bài viết, không thêm lời dẫn.`;
