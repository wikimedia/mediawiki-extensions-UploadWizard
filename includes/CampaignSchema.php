<?php
return array(
	"type" => "object",
	"id" => "#campaignnode",
	"required" => true,
	"properties" =>array(
		"enabled" => array(
			"type" => "boolean",
			"required" => true
		),
		"autoAdd" => array(
			"type" => "object",
			"properties" => array(
				"categories" => array(
					"type" => "array",
					"items" => array(
						array(
							"type" => "string"
						)
					)
				),
				"wikitext" => array(
					"type" => "string"
				)
			)
		),
		"fields" => array(
			"type" => "array",
			"items" => array(
				array(
					"type" => "object",
					"properties" => array(
						"wikitext" => array(
							"type" => "string"
						),
						"label" => array(
							"type" => "string"
						),
						"labelPage" => array(
							"type" => "string"
						),
						"maxLength" => array(
							"type" => "integer"
						),
						"initialValue" => array(
							"type" => "string"
						),
						"required" => array(
							"type" => "boolean"
						)
					)
				)
			)
		),
		"defaults" => array(
			"type" => "object",
			"properties" =>array(
				"alt" => array(
					"type" => "number"
				),
				"categories" => array(
					"type" => "array",
					"items" => array(
						array(
							"type" => "string"
						)
					)
				),
				"description" => array(
					"type" => "string"
				),
				"lat" => array(
					"type" => "number"
				),
				"lon" => array(
					"type" => "number"
				)
			)
		),
		"display" => array(
			"type" => "object",
			"properties" =>array(
				"headerLabelPage" => array(
					"type" => "string"
				),
				"thanksLabelPage" => array(
					"type" => "string"
				)
			)
		),
		"licensing" => array(
			"type" => "object",
			"properties" =>array(
				"defaultType" => array(
					"type" => "string"
				),
				"ownWorkDefault" => array(
					"type" => "string"
				),
				"ownWork" => array(
					"type" => "object",
					"properties" =>array(
						"default" => array(
							"type" => "string",
							"enum" => array_keys( UploadWizardConfig::getSetting( 'licenses' ) )
						),
						"licenses" => array(
							"type" => "array",
							"items" =>array(
								array(
									"type" => "string",
									"enum" => array_keys( UploadWizardConfig::getSetting( 'licenses' ) )
								)
							)


						),
						"template" => array(
							"type" => "string"
						),
						"type" => array(
							"type" => "string"
						)
					)
				),
				"thirdParty" => array(
					"type" => "object",
					"properties" =>array(
						"defaults" => array(
							"type" => "string",
							"enum" => array_keys( UploadWizardConfig::getSetting( 'licenses' ) )
						),
						"licenseGroups" => array(
							"type" => "array",
							"items" =>array(
								array(
									"type" => "object",
									"properties" =>array(
										"head" => array(
											"type" => "string"
										),
										"licenses" => array(
											"type" => "array",
											"items" =>array(
												array(
													"type" => "string",
													"enum" => array_keys( UploadWizardConfig::getSetting( 'licenses' ) )
												)
											)


										),
										"subhead" => array(
											"type" => "string"
										)
									)
								)
							)


						),
						"type" => array(
							"type" => "string"
						)
					)
				)
			)
		),
		"tutorial" => array(
			"type" => "object",
			"properties" =>array(
				"skip" => array(
					"type" => "boolean"
				),
				"helpdeskCoords" => array(
					"type" => "string"
				),
				"template" => array(
					"type" => "string"
				),
				"width" => array(
					"type" => "number"
				)
			)
		)
	)
);



