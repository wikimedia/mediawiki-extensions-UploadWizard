#
# This file is subject to the license terms in the COPYING file found in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/COPYING. No part of
# UploadWizard, including this file, may be copied, modified, propagated, or
# distributed except according to the terms contained in the COPYING file.
#
# Copyright 2012-2015 by the Mediawiki developers. See the CREDITS file in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/CREDITS
#
require 'tempfile'
require 'securerandom'
require 'chunky_png'

# helper functions to generate temporary files for testing image upload
module FileHelper
  def make_temp_image(filename, shade, width, height)
    path = "#{Dir.tmpdir}/#{filename}"
    image = ChunkyPNG::Image.new(shade, width, height)
    image.save path
    path
  end

  def create_large_image(size)
    path = Tempfile.new(['temp', '.png']).path
    # making the image consist of many triggers might trigger MediaWiki pixel limits
    # instead make it 1x1 and pump it up with metadata
    image = ChunkyPNG::Image.new(1, 1)
    # Chunky will compress long fields so we need to make sure it is incompressible
    image.metadata['Comment'] = SecureRandom.random_bytes(size)
    image.save path
    path
  end
end
