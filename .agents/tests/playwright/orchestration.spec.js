// @ts-check
const { test, expect } = require('@playwright/test');

test('Xác minh chức năng Orchestration tạo Run mới thành công', async ({ page }) => {
  console.log('1. Truy cập trang chủ Agents Dashboard...');
  const dashboardUrl = process.env.AGENTS_DASHBOARD_URL;
  test.skip(!dashboardUrl, 'Thiếu AGENTS_DASHBOARD_URL cho dashboard của project hiện tại.');
  await page.goto(dashboardUrl);

  // Xác minh tiêu đề trang
  await expect(page).toHaveTitle(/Agents Dashboard/);
  console.log('=> Đã tải trang Agents Dashboard thành công!');

  console.log('2. Click vào tab "Orchestration" trên thanh điều hướng...');
  const orchestrationTab = page.locator('button:has-text("Orchestration")');
  await expect(orchestrationTab).toBeVisible();
  await orchestrationTab.click();
  console.log('=> Đã click tab Orchestration.');

  console.log('3. Chờ và xác minh giao diện Orchestration hiển thị đầy đủ...');
  const workflowsHeader = page.locator('text=Run progress');
  await expect(workflowsHeader).toBeVisible({ timeout: 10000 });
  console.log('=> Tìm thấy phần "Run progress" hiển thị trên UI!');

  console.log('4. Thực hiện điền Form tạo một Workflow Run mới...');
  
  // Chọn workflow 'fast_path'
  const workflowSelect = page.locator('select[x-model="runForm.workflow"]');
  await expect(workflowSelect).toBeVisible();
  await workflowSelect.selectOption('fast_path');

  // Điền Title duy nhất để không bị trùng lặp
  const uniqueTitle = `Playwright Orchestration Verification Run ${Date.now()}`;
  const titleInput = page.locator('input[x-model\\.trim="runForm.title"]');
  await titleInput.fill(uniqueTitle);

  // Điền Source ID
  const sourceIdInput = page.locator('input[x-model\\.trim="runForm.sourceId"]');
  await sourceIdInput.fill(`PW-RUN-E2E-${Date.now()}`);

  // Điền Request
  const requestInput = page.locator('textarea[x-model\\.trim="runForm.request"]');
  await requestInput.fill('Verify lean orchestration run creation through Playwright automation test.');

  // Submit Form tạo Run
  console.log('=> Nhấn nút "Tạo run" để kích hoạt Workflow Control...');
  const submitButton = page.locator('button[type="submit"]:has-text("Tạo run")');
  await submitButton.click();

  // Xác minh Run mới được tạo thành công
  console.log('5. Đang đợi Run mới hiển thị ở Run progress...');
  const runBlock = page.locator('div.p-5', { has: page.locator(`text=${uniqueTitle}`) }).first();
  await expect(runBlock).toBeVisible({ timeout: 15000 });
  console.log('=> Run mới đã hiển thị thành công ở Run progress!');

  console.log('6. Xác minh dashboard không còn bề mặt Gate approve/reject hoặc Inbox/ACK...');
  await expect(page.locator('text=Gate approve / reject')).toHaveCount(0);
  await expect(page.locator('text=Inbox / ACK')).toHaveCount(0);
  await expect(page.locator('button:has-text("Approve")')).toHaveCount(0);

  console.log('7. Chụp ảnh màn hình làm bằng chứng tạo run thành công...');
  const screenshotPath = 'test-results/playwright_orchestration_test.png';
  await page.waitForTimeout(2000);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`=> Đã chụp ảnh màn hình và lưu tại: ${screenshotPath}`);

  console.log('=> KỊCH BẢN KIỂM THỬ PLAYWRIGHT E2E (TẠO RUN) HOÀN THÀNH (PASSED).');
});
