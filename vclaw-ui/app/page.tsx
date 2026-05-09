export default function DefaultHomePage() {
  // Trang này thường sẽ bị middleware redirect sang /[locale]
  // Nhưng nếu hit, chúng ta render một shell trống hoặc nội dung tối thiểu
  return null;
}
