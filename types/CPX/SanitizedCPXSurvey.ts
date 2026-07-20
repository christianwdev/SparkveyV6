type SanitizedCPXSurvey = {
  id: string,
  loiMinutes: number,
  sparks: number,
  score: number | null,
  ratingAverage: number,
  type: string,
  isTop: boolean,
  requiresWebcam: boolean,
};

export default SanitizedCPXSurvey;
