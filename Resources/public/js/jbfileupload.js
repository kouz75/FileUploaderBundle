(function ( $ ) {
    "use strict";

    $.fn.jbFileUpload = function( options ) {

        return this.each(function() {

            // Find parent div to allow select of all important children element
            var $parentTag = $(this).closest('.jb_fileupload_row'),
                $resultError = $parentTag.find('.jb_result_error'),
                $cropTool = $parentTag.find('.jb_crop_tool'),
                $cropUpload = $parentTag.find('.jb_crop_upload'),
                $cropImg = $parentTag.find('.jb_crop_img'),
                $cropX = $parentTag.find('.jb_crop_x'),
                $cropY = $parentTag.find('.jb_crop_y'),
                $cropWidth = $parentTag.find('.jb_crop_width'),
                $cropHeight = $parentTag.find('.jb_crop_height'),
                $cropFilename = $parentTag.find('.jb_crop_filename'),
                $previewTag = $parentTag.find('.jb_result_preview'),
                $loadingTag = $parentTag.find('.jb_loading'),
                $progressBar = $parentTag.find('.jb_progressbar'),
                naturalWidth, naturalHeight, currentWidth, currentHeight;

            /**
             * Translate message
             *
             * @param {string} msg
             *
             * @returns {string}
             */
            function translateMessage(msg) {
                if (typeof Translator !== "undefined") {
                    return Translator.trans(msg);
                }

                return msg;
            }

            /**
             * Toggle the upload field and crop tool
             *
             * @returns {undefined}
             */
            function toggleCropingTool() {
                $cropUpload.toggle();
                $cropTool.toggle();
                $cropX.val('');
                $cropY.val('');
                $cropWidth.val('');
                $cropHeight.val('');
            }

            /**
             * Load the crop tool
             *
             * @param {object} result
             *
             * @returns {undefined}
             */
            function loadCropingTool(result) {
                // Display the crop tool
                toggleCropingTool();

                // Bind coordinate when croping
                function showCoords(c) {
                    $cropX.val(Math.round(c.x * naturalWidth / currentWidth));
                    $cropY.val(Math.round(c.y * naturalHeight / currentHeight));
                    $cropWidth.val(Math.round(c.w * naturalWidth / currentWidth));
                    $cropHeight.val(Math.round(c.h * naturalHeight / currentHeight));
                };

                var cropConfig = {
                    onSelect: showCoords,
                    onChange: showCoords
                };
                $.each($cropImg.data(), function(index, value) {
                    cropConfig[index] = value;
                });
                $cropImg.attr('src', result.filepath).load(function() {
                    naturalHeight = this.naturalHeight;
                    naturalWidth = this.naturalWidth;
                    currentHeight = this.clientHeight;
                    currentWidth = this.clientWidth;
                    $cropImg.Jcrop(cropConfig);

                    // To remove multiple bind event on the same crop img element
                    $cropImg.unbind('load');
                });
            }

            /**
             * Fill preview and form hidden field
             *
             * @param {Object} data
             *
             * @returns {undefined}
             */
            function fillResult(data)
            {
                $parentTag.find('.jb_result_filename').val(data.filename);
                $parentTag.find('.jb_result_name').text(data.originalname);

                if ($previewTag.prop("tagName") === "IMG") {
                    $previewTag.attr('src', data.filepath);
                } else {
                    $previewTag.attr('href', data.filepath);
                }
            }

            /**
             * Process an ajax file upload success
             *
             * @param {object} e
             * @param {object} data
             *
             * @type {fileuploadFunction}
             */
            function fileUploadDone(e, data) {
                loadingToggle({});

                // Manage error
                $resultError.hide();
                if (typeof data.result.files !== "undefined" && typeof data.result.files[0] !== "undefined" && typeof data.result.files[0].error !== "undefined") {
                    $resultError.show();
                    var message = translateMessage(data.result.files[0].error);
                    $resultError.text(message);
                    $parentTag.trigger('jb.FileUpload.error', [message]);
                    return;
                }

                // If use crop. Load croping tools
                if ($(this).data('use-crop')) {
                    $cropFilename.val(data.result.filename);
                    loadCropingTool(data.result);
                    return;
                }

                fillResult(data.result);
                $parentTag.trigger('jb.FileUpload.success', [data.result]);
            }

            /**
             * Process the ajax file upload error
             *
             * @param {object} e
             * @param {object} data
             *
             * @returns {undefined}
             */
            function fileUploadError(e, data) {
                loadingToggle({});
                var message = "An Unknown Error Occurred";
                if (typeof e.responseJSON !== "undefined") {
                    if (typeof e.responseJSON.error !== "undefined" && typeof e.responseJSON.error.message !== "undefined") {
                        message = e.responseJSON.error.message;
                    } else if (typeof e.responseJSON[0] !== "undefined" && typeof e.responseJSON[0].message !== "undefined") {
                        message = e.responseJSON[0].message;
                    }
                } else {
                    if (typeof e.statusText !== "undefined") {
                        message = e.statusText;
                    }
                }
                $resultError.show();
                $resultError.text(message);
                $parentTag.trigger('jb.FileUpload.error', message);
            }

            /**
             * Run when starting file upload
             *
             * @param {object} e
             *
             * @returns {undefined}
             */
            function loadingToggle(e) {
                $loadingTag.toggle();
                $progressBar.toggle();
                $previewTag.toggle();
            }

            // JQuery plugin configuration
            var settings = $.extend({
                // These are the defaults.
                dataType: 'json',
                done: fileUploadDone,
                error: fileUploadError,
                start: loadingToggle,
                progressall: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    $progressBar.find('.jb_bar').css(
                        'width',
                        progress + '%'
                    );
                }
            }, options );

            // Bind all events
            // Reset field
            $parentTag.find('.jb_crop_reset').click(function(event){
                event.preventDefault();
                $cropImg.data('Jcrop').destroy();
                toggleCropingTool();
            });

            // Confirm field
            $parentTag.find('.jb_crop_confirm').click(function(event){
                event.preventDefault();
                $.post($cropImg.data('url'), $cropTool.find('.jb_crop_field').serialize(), function(data) {
                    $resultError.hide();
                    // Fill preview and hidden field
                    fillResult(data);
                    $parentTag.trigger('jb.FileUpload.success', [data]);
                    // Destroy and hide crop
                    $cropImg.data('Jcrop').destroy();
                    toggleCropingTool();
                }, 'json').fail(function(data) {
                    if (typeof data.responseJSON !== "undefined" && typeof data.responseJSON.error !== "undefined") {
                        $resultError.show();
                        var message = translateMessage(data.responseJSON.error);
                        $resultError.text(message);
                        $parentTag.trigger('jb.FileUpload.error', [message]);
                    }
                });
            });

            // Remove/Empty link;
            $parentTag.find('.jb_remove_link').click(function(event){
                event.preventDefault();
                event.stopPropagation();

                var previewData = $previewTag.data('default');
                var clearResultData = {
                    filename: '',
                    originalname: '',
                    filepath: previewData
                };
                fillResult(clearResultData);
                $parentTag.trigger('jb.FileUpload.remove', [clearResultData]);
            });

            // Load jquery file upload
            $(this).fileupload(settings);
        });
    };
}( jQuery ));
