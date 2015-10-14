import "deps/phoenix_html/web/static/js/phoenix_html"
import {Socket} from "deps/phoenix/web/static/js/phoenix/"

angular.module("collaboMarkerApp", [])
    .directive("scrollToBottom", function(){
        return {
            restrict: "A",
            scope: {
                trigger: "=scrollToBottom"
            },
            link: function postLink(scope, elem) {
                scope.$watch("trigger", function() {
                    elem[0].scrollTop = elem[0].scrollHeight - elem[0].offsetHeight;
                });
            }
        };
    })
    .controller("CollaboMarkerController", function($scope, $http) {

        $scope.users = [];
        $scope.input = {};
        $scope.receivedMessages = [];
        $scope.myself = null;

        var editor = ace.edit("cm-editor"),
            // 他ユーザからの push が無限ループしないように制御するフラグ
            // （ace の仕様上、これがないとうまく制御できなかったため）
            isFromMe = true,
            aceTextInputElement = null,
            cmEditorElement = null,
            cmPreviewElement = null,
            saveTimer = null,
            saveWaitTime = 2000;

        var socket = new Socket("/socket");
        socket.connect();
        var channel = socket.channel("editor:lobby", {});
        channel.join().receive("ok", function(dt) {
            dt.users.forEach(function(user) {
                user.cursor = {};
                $scope.users.push(user);
            });
            isFromMe = false;
            editor.setValue(dt.contents);
            editor.clearSelection();

            $scope.$apply();
        });

        // editor setting
        editor.$blockScrolling = Infinity;
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/markdown");
        editor.getSession().setUseWrapMode(true);
        editor.setReadOnly(true);

        editor.on("input", function() {
            isFromMe = true;
        });
        editor.on("change", function(e) {
            if (isFromMe) {
                channel.push("edit", { user: $scope.myself, event: e });
                if (saveTimer) {
                    clearTimeout(saveTimer);
                }
                saveTimer = setTimeout(save, saveWaitTime); 
            }
            document.getElementById("cm-preview").innerHTML = marked(editor.getValue());
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(save, saveWaitTime); 
            }
        });

        editor.session.selection.on("changeCursor", function(e) {
            if (!$scope.myself) {
                return;
            }
            // .ace_text-input に座標が適応されるのに少しラグがあるので、100ms 遅延させます
            setTimeout(function() {
                // getCursorPosition だと正確な絶対座標が割り出せないため、ace_text-input の座標を利用します
                if (!aceTextInputElement) {
                    aceTextInputElement = document.getElementsByClassName("ace_text-input")[0];
                }

                var style = window.getComputedStyle(aceTextInputElement),
                    top = style.getPropertyValue("top"),
                    left = style.getPropertyValue("left"),
                    scrollTop = editor.getSession().getScrollTop();

                top = Number(top.substring(0, top.length - 2));
                left = Number(left.substring(0, left.length - 2));

                if (top === 0 || left === 0) {
                    return;
                }

                channel.push("move", { user: $scope.myself, position: {left: left, top: top, scrollTop: scrollTop} });
            }, 100);
        });

        editor.session.on("changeScrollTop", function() {
            calculateCursorScreenPosition();
            calculatePreviewScrolltop();
        });

        function applyChangeEvent(event) {
            var contents = editor.getValue().split("\n");
            var action = event.action;

            if (action === "insert") {
                var remainedLine = "";
                event.lines.forEach(function(line, i) {
                    if (i === 0) {
                        var startLine = contents[event.start.row];
                        contents[event.start.row] = startLine.substring(0, event.start.column) + event.lines[i];
                        remainedLine = startLine.substring(event.start.column);
                    } else {
                        contents.splice(i + event.start.row, 0, event.lines[i]);
                    }
                });
                // 最後に remainedLine を足します
                var endLine = contents[event.end.row];
                contents[event.end.row] = endLine.substring(0, event.end.column) + remainedLine + endLine.substring(event.end.column);
            } else if (action === "remove") {
                var remainedLine = "";
                event.lines.forEach(function(line, i) {
                    if (event.lines.length > 1 && i < event.lines.length - 1) {
                        if (i === 0) {
                            remainedLine = contents[event.start.row].substring(0, event.start.column);
                        }
                        contents.splice(event.start.row, 1);
                    } else {    // 最後行
                        var startColumn = 0;
                        if (event.start.row === event.end.row) {
                            startColumn = event.start.column;
                        }
                        var startLine = contents[event.start.row];
                        contents[event.start.row] = remainedLine + startLine.substring(0, startColumn) + startLine.substring(event.end.column);
                    }
                });
            }

            // content の内容を editor に反映する
            var cursor = editor.getCursorPosition(),
                range = editor.getSelection().getRange();
            editor.setValue(contents.join("\n"), -1);
            editor.moveCursorTo(cursor.row, cursor.column);
            editor.getSelection().setRange(range);
        }

        function calculateCursorScreenPosition() {
            if (!cmEditorElement) {
                cmEditorElement = document.getElementById("cm-editor");
            }

            $scope.users.forEach(function(user) {
                if ($scope.myself && user.name === $scope.myself.name) {
                    user.cursor.hidden = true;
                    return;
                }
                if (!("top" in user.cursor) || !("left" in user.cursor)) {
                    user.cursor.hidden = true;
                    return;
                }
                var de = document.documentElement,
                    box = cmEditorElement.getBoundingClientRect(),
                    offsetTop = box.top + window.pageYOffset - de.clientTop,
                    offsetLeft = box.left + window.pageXOffset - de.clientLeft;

                var top = user.cursor.top + user.cursor.scrollTop - editor.getSession().getScrollTop() + 4;
                user.cursor.hidden = (top < 0 || top > 500);

                user.cursor.screenLeft = user.cursor.left + offsetLeft + "px";
                user.cursor.screenTop = top + offsetTop + "px";
            });

            $scope.$apply();
        }

        function calculatePreviewScrolltop() {
            // XXX: want to more smoothly...
            var startRow = editor.getFirstVisibleRow(),
                rows = editor.getValue().split("\n").length,
                ratio = startRow / rows;

            if (!cmPreviewElement) {
                cmPreviewElement = angular.element(document.querySelector("#cm-preview"))[0];
            }
            
            cmPreviewElement.scrollTop = cmPreviewElement.scrollHeight * ratio;
        }

        function save() {
            $http({
                method: "POST",
                url: "/save",
                data: { contents: editor.getValue() },
                headers: ["application/json"]
            });
        }

        channel.on("edit", function(dt) {
            if ($scope.myself && dt.user.name === $scope.myself.name) {
                return;
            }
            isFromMe = false;
            applyChangeEvent(dt.event);
        });

        channel.on("move", function(dt) {
            if ($scope.myself && dt.user.name === $scope.myself.name) {
                return;
            }
            var user = null;
            $scope.users.some(function(elem) {
                if (elem.name === dt.user.name) {
                    user = elem;
                }
            });
            if (!user) {
                // TODO: create init function
                user = {
                    name: dt.user.name,
                    color: dt.user.color,
                    cursor: { left: 0, top: 0, scrollTop: 0,
                        screenLeft: "0px", screenTop: "0px", hidden: false }
                };
                $scope.users.push(user);
            }
            user.cursor.left = dt.position.left;
            user.cursor.top = dt.position.top;
            user.cursor.scrollTop = dt.position.scrollTop;

            calculateCursorScreenPosition();
        });

        channel.on("update_user", function(dt) {
            $scope.users = [];
            dt.users.forEach(function(user) {
                user.cursor = {};
                $scope.users.push(user);
            });
            $scope.$apply();
            calculateCursorScreenPosition();
        });

        channel.on("message", function(dt) {
            $scope.receivedMessages.push(dt);
            $scope.$apply();
        });

        $scope.sendMessage = function() {
            if (!$scope.input.message) {
                return;
            }
            channel.push("message", { user: $scope.myself, message: $scope.input.message });
            $scope.input.message = "";
        };

        $scope.join = function() {
            if (!$scope.input.name) {
                return;
            }
            $scope.myself = {
                name: $scope.input.name,
                color: randomColor({luminosity: "light"})
            };
            channel.push("join", { user: $scope.myself });
            editor.setReadOnly(false);
        };

    });
