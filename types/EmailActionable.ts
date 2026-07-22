type EmailActionable = {
  actionableID: string,
  issueDate: Date,
  expiryDate: Date,
  accessedDate?: Date,
  deactivatedAt?: Date,
  userID: string,
  email: string,
  type: 'verification' | 'forgotPassword' | 'emailChange' | 'accountDeletion',
};

export default EmailActionable;
