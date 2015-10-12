import "deps/phoenix_html/web/static/js/phoenix_html"
import {Socket} from "deps/phoenix/web/static/js/phoenix/"

angular.module("collaboMarkerApp", [])
    .controller("CollaboMarkerController", function($scope, $http) {

        $scope.users = [];

        var editor = ace.edit("cm-editor"),
            // TODO: これは後でログイン的な機構で代替する
            myself = {
                name: Math.random().toString(36).slice(-8),
                color: randomColor({luminosity: "light"})
            },
            // 他ユーザからの push が無限ループしないように制御するフラグ
            // （ace の仕様上、これがないとうまく制御できなかったため）
            isFromMe = true,
            aceTextInputElement = null,
            cmEditorElement = null,
            saveTimer = null;

        var socket = new Socket("/socket");
        socket.connect();
        var channel = socket.channel("editor:lobby", {user: myself});
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
        // TODO: このタイミングで現時点でのコンテンツ内容を共有してもらう
        // TODO: カーソルも join のタイミングで初期化したい

        // editor setting
        editor.$blockScrolling = Infinity;
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/markdown");
        editor.getSession().setUseWrapMode(true);

        editor.on("input", function() {
            isFromMe = true;
        });
        editor.on("change", function(e) {
            if (isFromMe) {
                channel.push("edit", { user: myself, event: e });
            }
            document.getElementById("cm-preview").innerHTML = marked(editor.getValue());
            if (saveTimer) {
                clearTimeout(saveTimer);
            }
            saveTimer = setTimeout(save, 3000);
        });

        editor.session.selection.on("changeCursor", function(e) {
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

                channel.push("move", { user: myself, position: {left: left, top: top, scrollTop: scrollTop} });
            }, 100);
        });

        editor.session.on("changeScrollTop", function() {
            calculateCursorScreenPosition();
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
                if (user.name === myself.name) {
                    user.cursor.hidden = true;
                    return;
                }
                var de = document.documentElement,
                    box = cmEditorElement.getBoundingClientRect(),
                    offsetTop = box.top + window.pageYOffset - de.clientTop,
                    offsetLeft = box.left + window.pageXOffset - de.clientLeft;

                var top = user.cursor.top - editor.getSession().getScrollTop();
                user.cursor.hidden = (top < 0 || top > 500);

                user.cursor.screenLeft = user.cursor.left + offsetLeft + "px";
                user.cursor.screenTop = top + offsetTop + "px";
            });

            $scope.$apply();
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
            if (dt.user.name === myself.name) {
                return;
            }
            isFromMe = false;
            applyChangeEvent(dt.event);
        });

        channel.on("move", function(dt) {
            if (dt.user.name === myself.name) {
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
    });
