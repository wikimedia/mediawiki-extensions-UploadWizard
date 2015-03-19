#
# This file is subject to the license terms in the COPYING file found in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/COPYING. No part of
# UploadWizard, including this file, may be copied, modified, propagated, or
# distributed except according to the terms contained in the COPYING file.
#
# Copyright 2012-2014 by the Mediawiki developers. See the CREDITS file in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/CREDITS
#
class PreferencesPage
  include PageObject

  page_url 'Special:Preferences'

  a(:upload_wizard_pref_tab, id: "preftab-uploads")
  checkbox(:reset_skip_checkbox, id: "mw-input-wpupwiz_skiptutorial")
  button(:preferences_save_button, id: "prefcontrol")
  radio(:own_cc_zero_radio, id: "mw-input-wpupwiz_deflicense-ownwork-cc-zero")
  radio(:thirdparty_nasa_radio, id: "mw-input-wpupwiz_deflicense-thirdparty-pd-usgov-nasa")
  radio(:default_radio, id: "mw-input-wpupwiz_deflicense-default")
end
