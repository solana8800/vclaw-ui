# VClaw Sales Policy Simulation - SIM20260507045308

Ngày chạy: 2026-05-07

## Phạm vi

- Mô phỏng deterministic theo prompt/tool contract hiện tại, không gọi LLM để tránh kết quả không lặp lại.
- Có gọi tool thật qua `http://127.0.0.1:12687/api/vclaw/agent-tools`.
- DB live được seed/đọc trực tiếp: `/Users/vf-tuantd26-l/Documents/projects/vclaw/vclaw-ui/prisma/business.sqlite`.
- Có ghi DB thật: tạo/cập nhật sản phẩm test, khách test, đơn hàng, payment, task fulfillment.
- Sản phẩm test dùng prefix `SIM-`, khách test dùng SĐT `0945308001`...`0945308004`.

## Cấu hình shop tại thời điểm chạy

- Ngân hàng/VietQR: có cấu hình
- GHN: có token/shopId

## Kết luận nhanh

- physical-prepaid: Fulfillment chưa hoàn tất: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.
- physical-cod: Fulfillment chưa hoàn tất: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.

## Hàng vật lý trả trước rồi mới đặt ship

Sản phẩm: `SIM-PHYS-PREPAID`

### Hội thoại mô phỏng

- **customer**: Shop có máy lọc mini không, anh lấy 1 cái giao Quận 1.
- **tool**: vclaw.product.list: count=1
- **bot**: SIM Máy lọc mini trả trước giá 320.000đ. Anh gửi SĐT và địa chỉ để em lên đơn, đơn này chuyển khoản trước rồi shop đặt ship.
- **customer**: Anh lấy 1 cái, giao 72 Lê Lợi Q1, số 0900000001.
- **tool**: vclaw.checkout.prepare: nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","address"]
- **tool**: vclaw.checkout.prepare: nextAction=CREATE_PENDING_ORDER_AND_SEND_QR, canCreateOrder=true, missing=[]
- **tool**: vclaw.order.create: order=VESU050700011, paymentMode=PREPAID, fulfillmentMode=GHN_SHIPPING, hasQr=true, nextTool=vclaw.payment.verify_bill
- **bot**: Em tạo đơn VESU050700011 rồi. Anh chuyển 320.000đ đúng nội dung VESU050700011 0945308001 SIMPHYSPRE x1, gửi bill để em đối soát.
https://img.vietqr.io/image/tcb-69696969321-print.png?amount=320000&addInfo=VESU050700011+0945308001+SIMPHYSPRE+x1&accountName=TRAN+DANH+TUAN
- **customer**: Khách gửi ảnh bill chuyển khoản.
- **tool**: vclaw.payment.verify_bill: nextAction=FULFILL_ORDER
- **bot**: Bill khớp rồi anh. Em chuyển đơn sang bước đặt ship.
- **tool**: vclaw.shipping.create_ghn_order: success=false, message=Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.
- **bot**: Em đã ghi nhận đơn, bước giao/xuất đang cần shop xử lý thêm: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.

### Tool calls

- `vclaw.product.list` args={"query":"SIM-PHYS-PREPAID"} -> count=1
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-PHYS-PREPAID\",\"quantity\":1}]"} -> nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","address"]
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-PHYS-PREPAID\",\"quantity\":1}]","customerName":"Anh Prepaid Test","phone":"0945308001","shippingAddress":"72 Le Loi, Quan 1, TP.HCM"} -> nextAction=CREATE_PENDING_ORDER_AND_SEND_QR, canCreateOrder=true, missing=[]
- `vclaw.order.create` args={"customerName":"Anh Prepaid Test","phone":"0945308001","shippingAddress":"72 Le Loi, Quan 1, TP.HCM","amount":320000,"items":"[{\"productCode\":\"SIM-PHYS-PREPAID\",\"quantity\":1}]","channel":"Simulation"} -> order=VESU050700011, paymentMode=PREPAID, fulfillmentMode=GHN_SHIPPING, hasQr=true, nextTool=vclaw.payment.verify_bill
- `vclaw.payment.verify_bill` args={"paymentId":"cmov0g3ph002swp3yd2lxc7s0"} -> nextAction=FULFILL_ORDER
- `vclaw.shipping.create_ghn_order` args={"orderId":"cmov0g3ph002swp3yd2lxc7s0"} -> success=false, message=Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.

### DB được tạo/cập nhật

- Order: `VESU050700011` / id=`cmov0g3ph002swp3yd2lxc7s0`
- Customer: Anh Prepaid Test / 0945308001
- Amount: 320.000đ
- Status: `PROCESSING`
- Fulfillment: `GHN_SHIPPING` / `SHIPPING_REVIEW`
- Shipping address: 72 Le Loi, Quan 1, TP.HCM
- Items: SIM-PHYS-PREPAID x1 (320.000đ)
- Payments: `BANK_TRANSFER:VERIFIED:320.000đ`
- Tasks: `SHIPPING_REVIEW:NEW:Kiểm tra vận chuyển đơn VESU050700011`

### Phân tích

- Fulfillment chưa hoàn tất: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.


## Hàng vật lý ship COD

Sản phẩm: `SIM-PHYS-COD`

### Hội thoại mô phỏng

- **customer**: Chị lấy 2 áo thun, cho ship COD được không?
- **tool**: vclaw.product.list: count=1
- **bot**: SIM Áo thun COD giá 180.000đ. Được chị. Chị gửi SĐT + địa chỉ, em lên đơn COD không cần chuyển khoản trước.
- **customer**: Chị lấy 2 áo, giao 18 Nguyễn Trãi Q5, số 0900000002.
- **tool**: vclaw.checkout.prepare: nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","address"]
- **tool**: vclaw.checkout.prepare: nextAction=CREATE_COD_ORDER_AND_SHIPPING, canCreateOrder=true, missing=[]
- **tool**: vclaw.order.create: order=VESU050700012, paymentMode=COD, fulfillmentMode=GHN_SHIPPING, hasQr=false, nextTool=vclaw.shipping.create_ghn_order
- **bot**: Em tạo đơn COD VESU050700012 rồi, tổng 360.000đ. Em đặt vận đơn thu hộ cho chị.
- **tool**: vclaw.shipping.create_ghn_order: success=false, message=Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.
- **bot**: Em đã ghi nhận đơn, bước giao/xuất đang cần shop xử lý thêm: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.

### Tool calls

- `vclaw.product.list` args={"query":"SIM-PHYS-COD"} -> count=1
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-PHYS-COD\",\"quantity\":2}]"} -> nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","address"]
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-PHYS-COD\",\"quantity\":2}]","customerName":"Chị COD Test","phone":"0945308002","shippingAddress":"18 Nguyen Trai, Quan 5, TP.HCM"} -> nextAction=CREATE_COD_ORDER_AND_SHIPPING, canCreateOrder=true, missing=[]
- `vclaw.order.create` args={"customerName":"Chị COD Test","phone":"0945308002","shippingAddress":"18 Nguyen Trai, Quan 5, TP.HCM","amount":360000,"items":"[{\"productCode\":\"SIM-PHYS-COD\",\"quantity\":2}]","channel":"Simulation"} -> order=VESU050700012, paymentMode=COD, fulfillmentMode=GHN_SHIPPING, hasQr=false, nextTool=vclaw.shipping.create_ghn_order
- `vclaw.shipping.create_ghn_order` args={"orderId":"cmov0g8g90035wp3yt10auxvf"} -> success=false, message=Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.

### DB được tạo/cập nhật

- Order: `VESU050700012` / id=`cmov0g8g90035wp3yt10auxvf`
- Customer: Chị COD Test / 0945308002
- Amount: 360.000đ
- Status: `PROCESSING`
- Fulfillment: `GHN_SHIPPING` / `SHIPPING_REVIEW`
- Shipping address: 18 Nguyen Trai, Quan 5, TP.HCM
- Items: SIM-PHYS-COD x2 (180.000đ)
- Payments: `COD:COD_PENDING:360.000đ`
- Tasks: `SHIPPING_REVIEW:NEW:Kiểm tra vận chuyển đơn VESU050700012`

### Phân tích

- Fulfillment chưa hoàn tất: Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN.


## Sản phẩm online gửi qua email, bắt buộc thu tiền trước

Sản phẩm: `SIM-DIGITAL-EMAIL`

### Hội thoại mô phỏng

- **customer**: Anh mua voucher online, gửi qua email nhé.
- **tool**: vclaw.product.list: count=1
- **bot**: SIM Voucher online gửi email giá 250.000đ. Dạ voucher gửi email nên thanh toán trước. Anh gửi SĐT + email nhận voucher.
- **customer**: SĐT 0900000003, email digital@example.com.
- **tool**: vclaw.checkout.prepare: nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","email"]
- **tool**: vclaw.checkout.prepare: nextAction=CREATE_PENDING_ORDER_AND_SEND_QR, canCreateOrder=true, missing=[]
- **tool**: vclaw.order.create: order=VESU050700013, paymentMode=PREPAID, fulfillmentMode=EMAIL_DELIVERY, hasQr=true, nextTool=vclaw.payment.verify_bill
- **bot**: Em tạo đơn VESU050700013. Anh chuyển 250.000đ đúng nội dung VESU050700013 0945308003 SIMDIGITAL x1, gửi bill xong em xuất voucher qua email.
https://img.vietqr.io/image/tcb-69696969321-print.png?amount=250000&addInfo=VESU050700013+0945308003+SIMDIGITAL+x1&accountName=TRAN+DANH+TUAN
- **customer**: Khách gửi ảnh bill chuyển khoản.
- **tool**: vclaw.payment.verify_bill: nextAction=FULFILL_ORDER
- **bot**: Bill khớp rồi anh. Em tạo yêu cầu gửi voucher qua email ngay.
- **tool**: vclaw.digital.fulfill_email: {"orderId":"cmov0gc6j003hwp3yuo9ilb1u","orderNumber":"VESU050700013","email":"sim20260507045308-digital@example.com","message":"Đã tạo yêu cầu xuất hàng điện tử cho đơn VESU050700013.","instruction":"Báo khách shop đang gửi hàng qua email; không nói đã gửi xong nếu chưa có xác nhận từ hệ thống email/đối tác."}
- **bot**: Em đã tạo yêu cầu gửi hàng qua email.

### Tool calls

- `vclaw.product.list` args={"query":"SIM-DIGITAL-EMAIL"} -> count=1
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-DIGITAL-EMAIL\",\"quantity\":1}]"} -> nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","email"]
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-DIGITAL-EMAIL\",\"quantity\":1}]","customerName":"Anh Digital Test","phone":"0945308003","email":"sim20260507045308-digital@example.com"} -> nextAction=CREATE_PENDING_ORDER_AND_SEND_QR, canCreateOrder=true, missing=[]
- `vclaw.order.create` args={"customerName":"Anh Digital Test","phone":"0945308003","email":"sim20260507045308-digital@example.com","amount":250000,"items":"[{\"productCode\":\"SIM-DIGITAL-EMAIL\",\"quantity\":1}]","channel":"Simulation"} -> order=VESU050700013, paymentMode=PREPAID, fulfillmentMode=EMAIL_DELIVERY, hasQr=true, nextTool=vclaw.payment.verify_bill
- `vclaw.payment.verify_bill` args={"paymentId":"cmov0gc6j003hwp3yuo9ilb1u"} -> nextAction=FULFILL_ORDER
- `vclaw.digital.fulfill_email` args={"orderId":"cmov0gc6j003hwp3yuo9ilb1u","email":"sim20260507045308-digital@example.com"} -> {"orderId":"cmov0gc6j003hwp3yuo9ilb1u","orderNumber":"VESU050700013","email":"sim20260507045308-digital@example.com","message":"Đã tạo yêu cầu xuất hàng điện tử cho đơn VESU050700013.","instruction":"Báo khách shop đang gửi hàng qua email; không nói đã gửi xong nếu chưa có xác nhận từ hệ thống email/đối tác."}

### DB được tạo/cập nhật

- Order: `VESU050700013` / id=`cmov0gc6j003hwp3yuo9ilb1u`
- Customer: Anh Digital Test / 0945308003
- Amount: 250.000đ
- Status: `PROCESSING`
- Fulfillment: `EMAIL_DELIVERY` / `FULFILLMENT_REQUESTED`
- Shipping address: (none)
- Items: SIM-DIGITAL-EMAIL x1 (250.000đ)
- Payments: `BANK_TRANSFER:VERIFIED:250.000đ`
- Tasks: `DIGITAL_FULFILLMENT:NEW:Xuất hàng điện tử cho đơn VESU050700013`

### Phân tích

- Luồng đúng policy: bot biết cần thu tiền/giao hàng theo loại sản phẩm, không gọi QR sai cho COD, không fulfillment prepaid trước khi verify bill.


## Sản phẩm bán hộ bên thứ ba, xuất vé qua email

Sản phẩm: `SIM-THIRD-PARTY`

### Hội thoại mô phỏng

- **customer**: Chị lấy vé đối tác, xuất vé qua email giúp chị.
- **tool**: vclaw.product.list: count=1
- **bot**: SIM Vé đối tác qua email giá 450.000đ. Dạ vé đối tác cần thanh toán trước. Chị gửi SĐT + email nhận vé, em lên đơn.
- **customer**: SĐT 0900000004, email partner@example.com.
- **tool**: vclaw.checkout.prepare: nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","email"]
- **tool**: vclaw.checkout.prepare: nextAction=CREATE_EXTERNAL_ORDER, canCreateOrder=true, missing=[]
- **tool**: vclaw.order.create: order=VESU050700014, paymentMode=PREPAID, fulfillmentMode=THIRD_PARTY_API, hasQr=true, nextTool=vclaw.payment.verify_bill
- **bot**: Em tạo đơn VESU050700014. Chị chuyển 450.000đ đúng nội dung VESU050700014 0945308004 SIMTHIRDPA x1, gửi bill xong em xuất vé qua đối tác.
https://img.vietqr.io/image/tcb-69696969321-print.png?amount=450000&addInfo=VESU050700014+0945308004+SIMTHIRDPA+x1&accountName=TRAN+DANH+TUAN
- **customer**: Khách gửi ảnh bill chuyển khoản.
- **tool**: vclaw.payment.verify_bill: nextAction=FULFILL_ORDER
- **bot**: Bill khớp rồi chị. Em gửi đơn sang đối tác xuất vé.
- **tool**: vclaw.third_party.create_order: {"orderId":"cmov0gddc003uwp3yj0xkojk5","orderNumber":"VESU050700014","message":"Đã tạo yêu cầu xử lý bên thứ ba cho đơn VESU050700014.","instruction":"Chỉ báo khách đơn đang được xử lý; chưa hứa đã xuất vé/hàng nếu provider chưa trả mã xác nhận."}
- **bot**: Em đã gửi đơn sang đối tác xử lý.

### Tool calls

- `vclaw.product.list` args={"query":"SIM-THIRD-PARTY"} -> count=1
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-THIRD-PARTY\",\"quantity\":1}]"} -> nextAction=COLLECT_MISSING_FIELDS, canCreateOrder=false, missing=["name","phone","email"]
- `vclaw.checkout.prepare` args={"items":"[{\"productCode\":\"SIM-THIRD-PARTY\",\"quantity\":1}]","customerName":"Chị Partner Test","phone":"0945308004","email":"sim20260507045308-partner@example.com"} -> nextAction=CREATE_EXTERNAL_ORDER, canCreateOrder=true, missing=[]
- `vclaw.order.create` args={"customerName":"Chị Partner Test","phone":"0945308004","email":"sim20260507045308-partner@example.com","amount":450000,"items":"[{\"productCode\":\"SIM-THIRD-PARTY\",\"quantity\":1}]","channel":"Simulation"} -> order=VESU050700014, paymentMode=PREPAID, fulfillmentMode=THIRD_PARTY_API, hasQr=true, nextTool=vclaw.payment.verify_bill
- `vclaw.payment.verify_bill` args={"paymentId":"cmov0gddc003uwp3yj0xkojk5"} -> nextAction=FULFILL_ORDER
- `vclaw.third_party.create_order` args={"orderId":"cmov0gddc003uwp3yj0xkojk5","email":"sim20260507045308-partner@example.com","provider":"SIM_PARTNER"} -> {"orderId":"cmov0gddc003uwp3yj0xkojk5","orderNumber":"VESU050700014","message":"Đã tạo yêu cầu xử lý bên thứ ba cho đơn VESU050700014.","instruction":"Chỉ báo khách đơn đang được xử lý; chưa hứa đã xuất vé/hàng nếu provider chưa trả mã xác nhận."}

### DB được tạo/cập nhật

- Order: `VESU050700014` / id=`cmov0gddc003uwp3yj0xkojk5`
- Customer: Chị Partner Test / 0945308004
- Amount: 450.000đ
- Status: `PROCESSING`
- Fulfillment: `THIRD_PARTY_API` / `THIRD_PARTY_REQUESTED`
- Shipping address: (none)
- Items: SIM-THIRD-PARTY x1 (450.000đ)
- Payments: `BANK_TRANSFER:VERIFIED:450.000đ`
- Tasks: `THIRD_PARTY_FULFILLMENT:NEW:Gửi đơn VESU050700014 sang bên thứ ba`

### Phân tích

- Luồng đúng policy: bot biết cần thu tiền/giao hàng theo loại sản phẩm, không gọi QR sai cho COD, không fulfillment prepaid trước khi verify bill.

