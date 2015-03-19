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
class UploadPage
  include PageObject

  page_url 'Special:UploadWizard'

  span(:continue, text: "Continue")
  p(:duplicate_error, text: /You are already uploading/)
  div(:select_file_control_to_wait_for, class: 'mwe-upwiz-file-ctrl-container')
  file_field(:select_file, name: "file")
  button(:flickr_button, id: "mwe-upwiz-upload-ctrl-flickr")
  text_field(:flickr_url, id: "mwe-upwiz-flickr-input")
  button(:flickr_get_button, id: "mwe-upwiz-upload-add-flickr")
  button(:flickr_select_button, id: "mwe-upwiz-select-flickr")

  def flickr_upload(index)
    browser.li(id: "upload-" + index)
  end

  # We need to keep track of all the uploads on the page.
  # PageObjects are bad at finding elements that are repeated and change.
  # We have to break through to the underlying Watir library,
  # accessible through browser.

  # Get all the 'uploads' on the page, or more precisely the Upload
  # interfaces. n.b. there is at least one "unfilled" upload on
  # the page which is ready to accept new files. It is usually
  # invisible and its file input is styled to cover the button which
  # adds more files.
  def upload_interface_divs(is_filled)
    basic_constraint = "contains(@class,'mwe-upwiz-file')"
    filled_constraint = is_filled ? "contains(@class,'filled')" : "not(contains(@class,'filled'))"
    constraints = [basic_constraint, filled_constraint].join(' and ')
    browser.divs(
      xpath: "//div[@id='mwe-upwiz-filelist']/div[#{constraints}]"
    )
  end

  # break the upload divs into objects with easy to access 'properties'
  # n.b. in xpath, .// will search relative to current node
  def upload_objects(is_filled)
    upload_interface_divs(is_filled).map do |uploadDiv|
      {
        fileInput: uploadDiv.file_field(xpath: './/input[@type="file"]'),
        indicator: uploadDiv.div(xpath: './/div[contains(@class,"mwe-upwiz-file-indicator")]'),
        fileName: uploadDiv.div(xpath: './/div[contains(@class,"mwe-upwiz-visible-file-filename-text")]').text.strip,
        removeCtrl: uploadDiv.div(xpath: './/div[contains(@class,"mwe-upwiz-remove-ctrl-msg")]')
      }
    end
  end

  # return the filled uploads on the page (the visible stuff
  # with thumbnails and whatnot)
  def uploads
    upload_objects(true)
  end

  # The last upload on the page is 'empty', waiting to be filled.
  # It's either the one represented by the initial big button, or
  # it's the one represented by the "add more files" button.
  def upload_to_add
    upload_objects(false)[0]
  end

  # Gets upload by name. Filenames *should* be unique to be uploaded, but can be
  # non-unique (they should be in an error state if so), so this always returns an array
  def uploads_by_name(filename)
    uploads.select do |upload|
      upload[:fileName].eql?(filename)
    end
  end

  # for convenience in tests, when we know the filename is unique
  def upload_by_name(filename)
    uploads_by_name(filename)[0]
  end

  # In PageObject, file fields are magic, you can assign a path to
  # upload a file. However, this file field is a Watir::FileField,
  # so we use .set()
  def add_file(path)
    upload_to_add[:fileInput].set(path)
  end

  # Remove file(s) with a filename. Note, this is basename, not the full path
  def remove_file(filename)
    uploads_by_name(filename).each do |upload|
      upload[:removeCtrl].click
    end
  end

  # Check if an upload exists, by name. Return boolean
  def upload?(filename)
    uploads_by_name(filename).length > 0
  end
end
