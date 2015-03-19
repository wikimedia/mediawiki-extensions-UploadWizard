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
class UsePage
  include PageObject

  page_url 'Special:UploadWizard'

  span(:upload_more_files, text: "Upload more files")
  li(:highlighted_step_heading, xpath: "//ul[@id='mwe-upwiz-steps']/li[@id='mwe-upwiz-step-thanks'][@class='head']")
end
