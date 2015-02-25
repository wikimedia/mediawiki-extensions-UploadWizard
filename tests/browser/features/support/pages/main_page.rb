# Encoding: utf-8
# This file is subject to the license terms in the COPYING file found in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/COPYING.
# No part of UploadWizard, including this file, may be copied, modified,
# propagated, or distributed except according to the terms contained in the
# COPYING file.
#
# Copyright 2012-2014 by the Mediawiki developers. See the CREDITS file in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/CREDITS

# Main wiki page, where we land after logging in
class MainPage
  include PageObject
  include URL

  page_url URL.url('Main_Page')
  div(:tutorial_preference_set, id: "cucumber-tutorial-preference-set")
end
