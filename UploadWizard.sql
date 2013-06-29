-- MySQL version of the database schema for the Upload Wizard extension.
-- Licence: GNU GPL v2+
-- Author: Jeroen De Dauw < jeroendedauw@gmail.com >

-- Upload wizard campaigns
CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/uw_campaigns (
  campaign_id              INTEGER PRIMARY KEY NOT NULL AUTO_INCREMENT,
  campaign_name            VARCHAR(255)        NOT NULL,
  campaign_enabled         TINYINT             NOT NULL default '0'
) /*$wgDBTableOptions*/;

CREATE UNIQUE INDEX /*i*/uw_campaigns_name ON /*_*/uw_campaigns (campaign_name);
