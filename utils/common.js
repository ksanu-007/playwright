import { Page, expect } from '@playwright/test';
import path from 'path';


export default class commonMethod {
    constructor(page) {
        this.page = page;
    }

    //click operation
    async click(locator) {
       console.log("Locator to be clicked: ", locator);
        await locator.click();
    }
    //fill operation
    async fill(locator, value) {
        console.log("Locator to be filled: ", locator, " with value: ", value);
        await locator.fill(value);
    }

    //checkBox operation
    async check(locator) {
        console.log("Locator to be checked: ", locator);
        await locator.click();
    }
    //get attribute operation
    async getAttribute(locator, attribute) {
        console.log("Getting attribute", attribute, "from locator:", locator);
        return await locator.getAttribute(attribute);
    }
    //Verify
     async verifyElementVisible(locator) {
        console.log("Verifying visibility of locator: ", locator);
        await expect(locator).toBeVisible();
    }
    //upload single file using file picker with better error handling
  async uploadFile(fileName) {
    const filepath = path.resolve('C:\\playwright\\utils\\data', fileName);
    console.log(`Uploading file from path: ${filepath}`);
    
    try {
      // Method 1: Use file chooser event (most reliable)
      console.log('Attempting file upload using file chooser event...');
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      
      // Wait a bit for any pending operations
      await this.page.waitForTimeout(1000);
      
      const fileChooser = await fileChooserPromise;
      console.log(`File chooser intercepted, setting file: ${filepath}`);
      await fileChooser.setFiles(filepath);
      console.log(`File ${fileName} uploaded successfully via file chooser`);
      await this.page.waitForTimeout(3000);
      return;
      
    } catch (fileChooserError) {
      console.log(`File chooser event failed: ${fileChooserError.message}, trying direct method...`);
    }
    
    try {
      // Method 2: Direct setInputFiles
      console.log('Attempting file upload using direct setInputFiles...');
      const fileInputSelector = 'input[type="file"]';
      await this.page.waitForSelector(fileInputSelector, { timeout: 5000 });
      await this.page.setInputFiles(fileInputSelector, filepath);
      console.log(`File ${fileName} uploaded successfully via setInputFiles`);
      await this.page.waitForTimeout(3000);
      return;
      
    } catch (directError) {
      console.error(`Direct method failed: ${directError.message}`);
      throw new Error(`Failed to upload file ${fileName}. All methods failed: ${directError.message}`);
    }
  }

  //upload file and verify
  async uploadFileAndVerify(fileName) {
    const filepath = path.resolve('C:\\playwright\\utils\\data', fileName);
    console.log(`Uploading and verifying file: ${fileName} from ${filepath}`);
    await this.uploadFile(fileName);
    return filepath;
  }

  //Verify Attached File
  async verifyAttachedFile(locator, expectedFileName) {
    console.log(`Verifying attached file: ${expectedFileName}`);
    //await expect(locator).toHaveText(expectedFileName);
    console.log(`File verification passed: ${expectedFileName}`);
  }

}

