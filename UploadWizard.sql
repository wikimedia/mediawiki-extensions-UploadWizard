-- MySQL version of the database schema for the Upload Wizard extension.
-- Licence: GNU GPL v2+
-- Author: Jeroen De Dauw < jeroendedauw@gmail.com >

-- Upload wizard campaigns
CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/uw_campaigns (
  campaign_id              SMALLINT unsigned   NOT NULL auto_increment PRIMARY KEY,
  campaign_name            VARCHAR(255)        NOT NULL,
  campaign_enabled         TINYINT             NOT NULL default '0'
) /*$wgDBTableOptions*/;

CREATE UNIQUE INDEX /*i*/uw_campaigns_name ON /*_*/uw_campaigns (campaign_name);

-- Upload wizard campaign config
CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/uw_campaign_conf (
  cc_campaign_id           SMALLINT unsigned   NOT NULL,
  cc_property              VARCHAR(255)        NULL,
  cc_value                 BLOB                NULL
) /*$wgDBTableOptions*/;

CREATE UNIQUE INDEX /*i*/uw_cc_id_property ON /*_*/uw_campaign_conf (cc_campaign_id,cc_property);
CREATE INDEX /*i*/uw_cc_property ON /*_*/uw_campaign_conf (cc_property);