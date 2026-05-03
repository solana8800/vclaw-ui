/**
 * Prompts dành cho quản lý sản phẩm
 */

export const PRODUCT_EXTRACTION_PROMPT = (urls: string) => `Hãy đóng vai chuyên gia kiểm kê. Trích xuất JSON: {name, price, description, category} từ ảnh: ${urls}. Ngắn gọn, chính xác.`;

export const PRODUCT_MARKETING_PROMPT = (productName: string, description: string) => `Viết nội dung bán hàng cho "${productName}" (${description}).
Yêu cầu:
- Bán đúng sản phẩm "${productName}", không đổi sang sản phẩm khác, không gợi món không liên quan.
- Nếu có giá thật trong dữ liệu thì dùng giá thật; nếu không có giá thì không bịa giá.
- Mở đầu bằng lợi ích chính hoặc lý do nên mua ngay.
- Nêu ngắn 1-2 điểm nổi bật, phù hợp đăng chat/social.
- CTA chốt đơn rõ: nhắn SĐT/địa chỉ/số lượng để lên order pending, thanh toán QR.
- Không dùng câu rỗng kiểu "cần gì inbox", không nhận là bot.`;
