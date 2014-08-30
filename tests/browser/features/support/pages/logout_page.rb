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

# Simple page with no elements defined since visiting it does the trick
class LogoutPage
  include PageObject

  include URL
  def self.url
    URL.url('Special:UserLogout')
  end
  page_url url
end
