export default class WebLoginPageLocator {
    constructor(page) {
        this.page = page;
        this.emailInput = page.locator("//input[@placeholder='Enter email address']");
        this.passwordInput = page.locator("//input[@type='password']");
        this.continueButton = page.locator("(//div[@class='click-ripple'])[2]");
        this.nextButton = page.locator("//button[.//span[text()='Next']]");
        this.doneButton = page.locator("//button[.//span[text()='Done']]");
        this.featureXButton = page.locator(".responsiveModalContainer > div:nth-child(2) > div > div > button");
        this.loginverification = page.locator("//div[text()='How can I help?']");
        this.settingsAvatarButton = page.locator('[title="Settings"]');
        this.logoutButton = page.locator("//button[.//span[text()='Logout']]");

        // Microsoft/Entra ID SSO redirect (login.microsoftonline.com) reached
        // after continueButton on an SSO account's email. Its password field
        // matches the same passwordInput xpath above; only its submit button
        // differs from the app's own click-ripple continueButton. #idSIButton9
        // is Microsoft's standard primary-button id, reused for both the
        // "Sign in" button and the following "Stay signed in?" prompt's "Yes".
        this.ssoSubmitButton = page.locator('#idSIButton9');
        this.ssoInvalidCreds = page.locator("text=Your account or password is incorrect");
        this.ssoStaySignedInHeading = page.locator("text=Stay signed in?");

        // Verified live 2026-08-19: an ADFS-configured account (real
        // @twinkle.netsferetest.org domain — an earlier attempt against a
        // non-SSO-configured @sanu.netsferetest.org account for the same
        // display name never redirected at all, which is what led to the
        // wrong conclusion that no redirect happens) DOES redirect to a
        // genuine on-prem ADFS server (fs.netsferedev.com/adfs/ls/, a real
        // default ADFS 2016/2019 form-based-auth page — "NetSfere Dev
        // Inc." heading is just this org's branded ADFS theme). Confirmed
        // via direct DOM inspection (`page.evaluate` dump, since the
        // "Sign in" control is NOT a real <button> — a first, unverified
        // guess at `button:has-text("Sign in")` matched zero elements and
        // hung): the real submit control is
        // `<span id="submitButton" role="button">Sign in</span>`, ADFS's
        // own default element id — same id (and #passwordInput) as
        // vanilla/out-of-box ADFS deployments generally use, so #submitButton
        // was actually the right instinct on the very first (later
        // second-guessed) attempt.
        this.adfsSignInButton = page.locator('#submitButton');
    }
}


