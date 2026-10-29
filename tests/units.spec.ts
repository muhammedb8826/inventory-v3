import { test, expect } from '@playwright/test';
async function login(page:import('@playwright/test').Page){
  await page.goto('/login');await page.getByLabel(/email/i).fill('test@example.test');await page.getByLabel('Password',{exact:true}).fill('TestPassword123!');await page.getByRole('button',{name:/sign in|log in|login/i}).click();await page.waitForURL('**/dashboard');
}
test('stock unit selection is searchable and controls quantity precision',async({page})=>{
  await login(page);await page.goto('/inventory/new');
  const selector=page.getByRole('combobox',{name:'Stock unit'});
  await expect(selector).toContainText('Piece',{timeout:15000});
  const qty=page.getByLabel('Opening quantity',{exact:false});
  await expect(qty).toHaveAttribute('step','1');await qty.fill('1.5');expect(await qty.evaluate((el:HTMLInputElement)=>el.validity.stepMismatch)).toBe(true);
  await selector.click();await page.getByRole('textbox',{name:'Search units'}).fill('kilogram');
  await page.getByRole('option',{name:/Kilogram/}).click();
  await expect(selector).toContainText('Kilogram');await expect(qty).toHaveAttribute('step','0.001');
  expect(await qty.evaluate((el:HTMLInputElement)=>el.validity.stepMismatch)).toBe(false);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('unit catalog supports creation and responsive management',async({page})=>{
  await login(page);await page.goto('/units');
  await expect(page.getByRole('heading',{name:'Units of measure',exact:true})).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:'Add unit',exact:true}).click();
  await page.getByLabel('Code',{exact:true}).fill('TEST_M');await page.getByLabel('Name',{exact:true}).fill('Test metre');await page.getByLabel('Symbol',{exact:true}).fill('tm');
  await page.getByLabel('Category',{exact:true}).selectOption('LENGTH');await page.getByLabel('Quantity precision',{exact:true}).selectOption('3');
  const pending=page.waitForRequest(r=>r.url().endsWith('/api/backend/units')&&r.method()==='POST');
  await page.getByRole('button',{name:'Save unit',exact:true}).click();const sent=(await pending).postDataJSON();expect(sent).toMatchObject({code:'TEST_M',category:'LENGTH',decimalPlaces:3});
  await expect(page.getByRole('dialog')).toBeHidden();await expect(page.getByText('Test metre',{exact:true}).filter({visible:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('article').filter({hasText:'Test metre'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
