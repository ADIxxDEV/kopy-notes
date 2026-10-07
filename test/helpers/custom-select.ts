import type {Locator} from '@playwright/test';
export async function selectOption(control:Locator,value:string){await control.click();await control.page().getByRole('listbox').locator(`[data-select-value=${JSON.stringify(value)}]`).click();}
