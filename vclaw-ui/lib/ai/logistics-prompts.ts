/**
 * Prompts liên quan đến vận chuyển và logistics (chuẩn hóa địa chỉ)
 */

export const ADDRESS_SYSTEM_PROMPT = "Bạn là một AI hữu ích, luôn trả về JSON hợp lệ.";

export const ADDRESS_STANDARDIZATION_PROMPT = (rawAddress: string) => `Bạn là chuyên gia xử lý địa chỉ tại Việt Nam. 
Hãy phân tích địa chỉ sau thành JSON có cấu trúc:
Địa chỉ: "${rawAddress}"

Yêu cầu trả về JSON duy nhất theo định dạng:
{
  "province": "Tỉnh/Thành phố",
  "district": "Quận/Huyện",
  "ward": "Phường/Xã",
  "street": "Số nhà, tên đường"
}
Lưu ý: 
- Nếu không tìm thấy thông tin nào, hãy để chuỗi rỗng.
- Trả về JSON nguyên bản, không kèm Markdown code block hay văn bản giải thích.`;
