#!/usr/bin/python -u
# Public domain

import argparse
import sys
import unittest
import urllib2
import wikitools

# This script also depends on poster: https://pypi.python.org/pypi/poster/

# Global wiki object to perform API calls.
wiki = None

# Global verbosity variable used inside the tests.
verbosity = 0


class TestUploadWizardAPICalls(unittest.TestCase):
    """Test API calls done by the Upload Wizard"""

    # Test use same global variables initialized in main().
    global wiki
    global verbosity

    def testUploadImageUsingWizardWorkflow(self):
        """Test that basic api calls used by the UploadWizard are working as expected"""

        # Get edit token
        params = {
            "action": "tokens",
            "type": "edit",
        }
        req = wikitools.api.APIRequest(wiki, params)

        data = req.query()

        token = data["tokens"]["edittoken"]

        self.assertTrue(len(token) > 0, "Could not get valid token")

        # Upload file to stash area
        params = {
            "action": "upload",
            "token": token,
            "stash": "1",
            "ignorewarnings": "true",
            "filename": "55390test-image-rosa-mx-15x15.png",
            "file": open("./test-image-rosa-mx-15x15.png"),
        }
        req = wikitools.api.APIRequest(wiki, params, multipart=True)
        data = req.query()

        if verbosity >= 3:
            print "Response from stash upload API call:", data

        result = data["upload"]["result"]
        self.assertEqual(result, "Success", "Stash upload API call FAILED.")

        filekey = data["upload"]["filekey"]
        self.assertTrue(len(filekey) > 0, "Could not get valid filekey")

        if verbosity >= 3:
            print "filekey:", filekey

        # Upload file for real using the filekey from previous call
        params = {
            "action": "upload",
            "token": token,
            "filekey": filekey,
            "ignorewarnings": "true",
            "filename": "Test-image-rosa-mx-15x15.png",
            "comment": "Test image uploaded via python script.",
            "text": "[[Category:Test images]]",
        }
        req = wikitools.api.APIRequest(wiki, params)
        data = req.query()

        if verbosity >= 3:
            print "Response to upload API call:", data

        result = data["upload"]["result"]
        self.assertEqual(result, "Success", "Upload API call FAILED.")

        url = data["upload"]["imageinfo"]["url"]

        # Assert uploaded content same as source file !
        file_content = file("./test-image-rosa-mx-15x15.png", "rb").read()
        url_content = urllib2.urlopen(url).read()

        self.assertEqual(url_content, file_content, "Uploaded content different than original !")

        if verbosity >= 3:
            print "File uploaded successfully !"

    def testFileInfoAPICall(self):
        """Test file info api call used by the UploadWizard"""

        # Try to get file info from a non-existent file
        params = {
            "action": "query",
            "titles": "File:Test-image-non-existant-15x15.png",
            "prop": "info|imageinfo",
            "inprop": "protection",
            "iiprop": "url|mime|size",
            "iiurlwidth": "150",
        }
        req = wikitools.api.APIRequest(wiki, params)
        data = req.query()

        if verbosity >= 3:
            print "Response to file info API call:", data

        # Assert that no information was found about the file.
        result = data["query"]["pages"]["-1"]["missing"]
        self.assertEqual(result, "")

    def testTitleBlacklistedAPICall(self):
        """Test title blacklisted api call used by the UploadWizard"""

        # Get titleblacklist info
        params = {
            "action": "titleblacklist",
            "tbaction": "create",
            "tbtitle": "File:Test-image-rosa-mx-15x15.png",
        }
        req = wikitools.api.APIRequest(wiki, params)
        data = req.query()

        if verbosity >= 3:
            print "Response to upload API call:", data

        result = data["titleblacklist"]["result"]
        self.assertEqual(result, "ok")


def main():
    """Script that tests some API calls and workflows used by the UploadWizard.
        Example:
            $ python upload-wizard_tests.py --username some_username --password secret_password
    """

    # Global varibles that are going to be used by the tests.
    global wiki
    global verbosity

    # Parse line arguments
    parser = argparse.ArgumentParser(description="Upload Wizard API smoke tests.")
    parser.add_argument("--api_url", default="https://commons.wikimedia.org/w/api.php",
                        help="URL of wiki API, such as http://example.org/w/api.php")
    parser.add_argument("--username", required=True, help="Username for API calls")
    parser.add_argument("--password", required=True, help="Password for API calls")
    parser.add_argument("-v", "--verbose", type=int, default=0, help="Increase output verbosity")
    args = parser.parse_args()

    # Create wikitools object
    wiki = wikitools.Wiki(args.api_url)
    verbosity = args.verbose

    # Log in user
    wiki.login(args.username, args.password)

    if not wiki.isLoggedIn():
        sys.stderr.write("Wrong credentials, please try again.\n")
        exit(1)

    # Run tests
    suite = unittest.TestLoader().loadTestsFromTestCase(TestUploadWizardAPICalls)
    unittest.TextTestRunner(verbosity=verbosity).run(suite)

    # Log out user
    wiki.logout()


if __name__ == "__main__":
    main()
