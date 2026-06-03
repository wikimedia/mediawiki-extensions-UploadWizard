( function ( uw ) {

	/**
	 * Base class for a category suggestion provider.
	 *
	 * A provider turns one signal about an upload (its title, EXIF metadata,
	 * location, the uploader's history, ...) into a list of candidate categories.
	 * Providers are collected and combined by uw.CategorySuggestionAggregator; the
	 * user is only ever *offered* the result, never has categories added
	 * automatically.
	 *
	 * Subclasses should override #isEnabled (when the provider depends on an
	 * optional capability, e.g. the GeoData or CirrusSearch extension) and
	 * #getSuggestions.
	 *
	 * @abstract
	 * @class
	 * @constructor
	 */
	uw.CategorySuggestionProvider = function UWCategorySuggestionProvider() {};

	/**
	 * Whether this provider can run in the current environment.
	 *
	 * Providers that rely on an optional extension or API should feature-detect
	 * here and return false when their dependency is missing, so the feature
	 * degrades gracefully instead of erroring. The aggregator skips providers for
	 * which this returns false.
	 *
	 * @return {boolean}
	 */
	uw.CategorySuggestionProvider.prototype.isEnabled = function () {
		return true;
	};

	/**
	 * Produce category suggestions for the given upload context.
	 *
	 * The base implementation returns no suggestions. Subclasses return a list of
	 * `{ title, score, source }` objects, where:
	 *
	 * - `title` {string} is a category name without the namespace prefix.
	 * - `score` {number} is the provider's confidence, **normalized to the
	 *   inclusive range 0..1** (0 = least relevant, 1 = most relevant). The range
	 *   is a contract: every provider must map its own internal signal onto this
	 *   common scale so that scores from different providers are comparable. This
	 *   is what lets uw.CategorySuggestionAggregator combine sources meaningfully
	 *   (e.g. give a category found by several providers an agreement bonus)
	 *   rather than letting whichever provider happens to emit larger raw numbers
	 *   dominate. The range constrains each provider's output; the aggregated
	 *   score may differ depending on how the aggregator combines duplicates.
	 * - `source` {string} identifies the provider (e.g. 'title', 'geo').
	 * - `count` {number|null} (optional) is the number of members in the
	 *   category, used for display only. Providers that don't know it (or for
	 *   which it isn't available) should set `null`, in which case no count is
	 *   shown for that suggestion.
	 *
	 * A rejected promise (or a thrown error) is treated by the aggregator as "no
	 * suggestions from this provider" and never blocks the other providers.
	 *
	 * @param {Object} context See uw.CategorySuggestionAggregator#getSuggestions
	 * @param {mw.UploadWizardUpload} context.upload
	 * @param {string} context.title File title text (without namespace/extension)
	 * @param {Object} context.metadata Image metadata (EXIF etc.), may be empty
	 * @param {string[]} context.selected Category titles already selected
	 * @param {mw.Api} context.api
	 * @return {jQuery.Promise} Promise resolving to an array of
	 *   `{ title: string, score: number, source: string, count: number|null }`
	 *   suggestions, where `score` is normalized to 0..1 (see above)
	 */
	uw.CategorySuggestionProvider.prototype.getSuggestions = function () {
		return $.Deferred().resolve( [] ).promise();
	};

}( mw.uploadWizard ) );
