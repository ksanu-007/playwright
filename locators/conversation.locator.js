export default class ConversationPageLocator {
  constructor(page) {
        this.page = page;
    this.startConversation = page.getByTitle('Start Conversation');
    this.searchUserName = page.locator('.namegenEmailReplace');
    this.selectUserName = page.locator("(//div[contains(@displayname,'playou')])[1]");
    this.selectOtherUserName = page.locator("(//div[contains(@displayname,'playou')])[1]");
    this.selectsecondusername = page.locator("(//div[contains(@displayname,'playou')])[1]");
    this.createButton = page.locator('//*[text()="Create"]');
    this.writeMessage = page.locator('(//textarea[@class="namegenTextLong"])[1]');
    this.sendButton = page.locator('//*[@class="fa fa-paper-plane"]');
    this.AddAttachmentButton = page.locator('//span[contains(@class,"icon ion-plus-circled")]');
    this.fromDeviceButton = page.locator('(//div[contains(@class, "chat-options-slat-title")])[1]');
    this.uploadSendButton = page.locator('//span[text()="Send"]');
    this.AttachedFileName = page.locator('//div[contains(@class,"attachment-metadata")]/div[1]/span');
    this.ShareLocation = page.locator('//div[text() = "Share Location"]');
    this.SendLocationButton = page.locator('//span[text()="Send"]');
    this.CopyLinkSecureMeet = page.locator("//div[text()='Copy Link']");
    this.favoriteButton = page.locator("//div[text() = 'Favorite']");
    this.unfavoriteButton = page.locator("//div[text() = 'Unfavorite']");
    this.EditPArticipantsButton = page.locator("//div[text() = 'Edit Participant(s)']");
    this.EditPArticipantsSaveButton = page.locator("//span[text() = 'Save']"); 
    this.voicemessageButton = page.locator("(//span[@class='fa fa-microphone'])");
    this.voicemessagestopButton = page.locator("(//span[@class='fa fa-stop'])");
    this.makeacallButton = page.locator("//button[@title='Make Call']/div[1]");
    this.endcallButton = page.locator("(//button[@title='End call'])[2]");
    this.makeavideocallButton = page.locator("//button[@title='Make Video Call']/div[1]");
    this.endvideocallButton = page.locator("(//button[@title='End call'])[2]");
    this.createpollButton = page.locator("//div[text() = 'Create Poll']");
    this.enterpollquestion = page.getByPlaceholder('Enter poll question');
    this.enteroption1 = page.getByPlaceholder('Answer 1');
    this.enteroption2 = page.getByPlaceholder('Answer 2');
    
  }
}