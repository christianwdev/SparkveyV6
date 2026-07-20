type PersonalInformationIncomplete = {
  completedAt?: undefined,
  firstName?: string,
  lastName?: string,
  dateOfBirth?: Date,
  gender?: 'male' | 'female' | 'other',
  country?: string,
  city?: string,
  zipCode?: string,
};

type PersonalInformationComplete = {
  completedAt: Date,
  firstName: string,
  lastName: string,
  dateOfBirth: Date,
  gender: 'male' | 'female' | 'other',
  country: string,
  city: string,
  zipCode: string,
};

type PersonalInformation = PersonalInformationIncomplete | PersonalInformationComplete;

export type {
  PersonalInformationIncomplete,
  PersonalInformationComplete,
};
export default PersonalInformation;
