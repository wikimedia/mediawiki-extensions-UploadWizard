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
class LearnPage
  include PageObject

  include URL
  page_url URL.url("Special:UploadWizard")

  div(:tutorial, id: "mwe-upwiz-stepdiv-tutorial")

  span(:next) do |page|
    page.tutorial_element.span_element(text: "Next")
  end
  checkbox(:tutorial_skip, id: "mwe-upwiz-skip")
end
