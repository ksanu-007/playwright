const { test, expect } = require('@playwright/test');
const GmailUtil = require('./GmailUtil');
const testData = require('../testData/testData.json');

test('Verify Login using OTP', async ({ page }) => {

    // Perform actions that trigger OTP

    await page.click('#sendOtp');

    // Fetch OTP from Gmail
    const otp = await GmailUtil.getOTP(
        testData.gmail.email,
        testData.gmail.appPassword
    );

    console.log("OTP:", otp);

    await page.fill('#otp', otp);

    await page.click('#verify');

});