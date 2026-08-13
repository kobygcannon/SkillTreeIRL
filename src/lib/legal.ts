const value=(name:string,fallback:string)=>process.env[name]?.trim()||fallback;
export const legalConfig={
  entity:value("LEGAL_ENTITY_NAME","SkillTree IRL operator"),
  address:value("LEGAL_ENTITY_ADDRESS","Operator address not configured"),
  contact:value("LEGAL_CONTACT_EMAIL","support contact not configured"),
  governingLaw:value("LEGAL_GOVERNING_LAW","applicable local law"),
  cancellation:value("LEGAL_CANCELLATION_TERMS","You may cancel a paid subscription from account settings. Access continues until the end of the paid period unless applicable law requires otherwise."),
  controller:value("PRIVACY_CONTROLLER_NAME",value("LEGAL_ENTITY_NAME","SkillTree IRL operator")),
  retention:value("PRIVACY_RETENTION_SUMMARY","Account data is retained while the account is active and deleted following an authenticated deletion request, subject to narrowly required legal, fraud-prevention, and financial-record retention."),
  lawfulBases:value("PRIVACY_LAWFUL_BASES","contract performance, legitimate interests in service security and improvement, consent where requested, and compliance with legal obligations"),
  updated:value("LEGAL_LAST_UPDATED","13 August 2026")
};
export const legalConfigurationReady=()=>["LEGAL_ENTITY_NAME","LEGAL_ENTITY_ADDRESS","LEGAL_CONTACT_EMAIL","LEGAL_GOVERNING_LAW","PRIVACY_CONTROLLER_NAME","PRIVACY_RETENTION_SUMMARY","PRIVACY_LAWFUL_BASES"].every(name=>Boolean(process.env[name]?.trim()));
