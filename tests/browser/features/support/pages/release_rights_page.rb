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
class ReleaseRightsPage
  include PageObject

  page_url 'Special:UploadWizard'

  radio(:my_own_work, id: "deedChooser1-ownwork")
  radio(:provide_copyright_information, id: "deedChooser1-custom")
  div(:next_parent, id: "mwe-upwiz-stepdiv-deeds")
  span(:next) do |page|
    page.next_parent_element.span_element(text: "Next")
  end
  div(:thumbnail, id: "mwe-upwiz-deeds-thumbnails")
  li(:highlighted_step_heading, xpath: "//ul[@id='mwe-upwiz-steps']/li[@id='mwe-upwiz-step-deeds'][@class='arrow head']")
end
