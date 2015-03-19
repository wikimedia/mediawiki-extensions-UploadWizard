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
class UploadWizardPage
  include PageObject

  page_url 'Special:UploadWizard'

  div(:stepdiv_file, id: "mwe-upwiz-stepdiv-file")
  text_field(:add_categories, id: "categories0")
  text_field(:altitude, id: "location-alt0")
  text_field(:author, name: "author2")
  textarea(:author, name: "author") # todo # fix duplicate
  radio(:believe_free, id: "license2_13")
  a(:categories, text: "Add categories and more information ...")
  a(:cc, text: "The copyright holder published this work with the right Creative Commons license")
  radio(:cc_cc, id: "license1_2")
  radio(:cc_waiver, id: "license2_4")
  radio(:cca2, id: "license2_3")
  radio(:cca3, id: "license1_1")
  radio(:cca3_2, id: "license2_2")
  radio(:cca_2_2, id: "license2_6")
  radio(:cca_sa, id: "license1_0")
  radio(:cca_sa2, id: "license2_1")
  radio(:cca_sa20, id: "license2_5")
  radio(:cca_sa3, id: "license2_0")
  button(:continue_button, xpath: "//div[2]/div[2]/div/button")
  # todo # replace xpath # button(:continue_button, class: "mwe-upwiz-button-next ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only")
  text_field(:date_created, id: "dateInput0")
  textarea(:description_field, name: "description1")
  a(:different_license, text: "Use a different license")
  a(:expired, text: "The copyright has definitely expired in the USA")
  a(:flickr, text: "The copyright holder published their photo or video on Flickr with the right license")
  a(:found_it, text: "I found it on the Internet -- I'm not sure")
  radio(:free_form, id: "license2_12")
  textarea(:free_lic, id: "license2_12_custom")
  select(:language, name: "lang")
  text_field(:latitude, id: "location-lat0")
  # todo # check if legal_* links actually go the right place https://bugzilla.wikimedia.org/show_bug.cgi?id=35702
  a(:legal_code_cc_sa25, href: "https://creativecommons.org/licenses/by-sa/2.5/")
  a(:legal_code_cc_sa3, href: "https://creativecommons.org/licenses/by-sa/3.0/")
  a(:legal_code_cc_waiver, href: "https://creativecommons.org/publicdomain/zero/1.0/")
  a(:legal_code_cca25, href: "https://creativecommons.org/licenses/by/2.5/")
  a(:legal_code_cca3, href: "https://creativecommons.org/licenses/by/3.0/")
  a(:legal_code_recommended, href: "https://creativecommons.org/licenses/by-sa/3.0/")
  a(:logged_in, text: "logged in")
  text_field(:longitude, id: "location-lon0")
  radio(:nasa, id: "license2_11")
  span(:next, text: "Next")
  button(:next_button, xpath: "//div[4]/button")
  a(:not_mentioned, text: "Another reason not mentioned above")
  textarea(:other_information, id: "otherInformation0")
  radio(:own_work_button, id: "deedChooser1-ownwork")
  radio(:pre_1923, id: "license2_8")
  a(:recommended_license, text: "Use the recommended license")
  radio(:repro, id: "license2_9")
  file_field(:select_file, name: "file")
  checkbox(:skip_radio, id: "mwe-upwiz-skip")
  textarea(:source, name: "source")
  radio(:third_party_button, id: "deedChooser1-thirdparty")
  text_field(:title_field, id: "title0")
  div(:tutorial_map, id: "mwe-upwiz-tutorial")
  a(:us_govt, text: "This work was made by the United States government")
  radio(:us_govt_2, id: "license2_7")
  radio(:us_govt_3, id: "license2_10")
end
