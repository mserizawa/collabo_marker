import "deps/phoenix_html/web/static/js/phoenix_html"
import {Socket} from "deps/phoenix/web/static/js/phoenix/"

angular.module("collaboMarkerApp", [])
    .controller("CollaboMarkerController", function($scope) {

        var socket = new Socket("/socket");
        socket.connect();
        var channel = socket.channel("editor:lobby", {});
        channel.join();
        // TODO: このタイミングで現時点でのコンテンツ内容を共有してもらう
        // TODO: カーソルも join のタイミングで初期化したい

        var editor = ace.edit("cm-editor"),
            // TODO: これは後でログイン的な機構で代替する
            myself = {
                name: Math.random().toString(36).slice(-8),
                color: randomColor({luminosity: "dark"})
            },
            // 他ユーザからの push が無限ループしないように制御するフラグ
            // （ace の仕様上、これがないとうまく制御できなかったため）
            isFromMe = true,
            aceTextInputElement = null;

        $scope.users = [];

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
        });

        editor.session.selection.on("changeCursor", function(e) {
            // .ace_text-input に座標が適応されるのに少しラグがあるので、100ms 遅延させます
            setTimeout(function() {
                // getCursorPosition だと正確な絶対座標が割り出せないため、ace_text-input の座標を利用します
                if (!aceTextInputElement) {
                    aceTextInputElement = document.getElementsByClassName("ace_text-input")[0];
                }
                var de = document.documentElement,
                    box = aceTextInputElement.getBoundingClientRect(),
                    top = box.top + window.pageYOffset - de.clientTop,
                    left = box.left + window.pageXOffset - de.clientLeft;

                channel.push("move", { user: myself, position: {left: left, top: top} });
            }, 100);
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
                    cursor: { left: 0, top: 0 }
                };
                $scope.users.push(user);
            }
            user.cursor.left = dt.position.left + "px";
            user.cursor.top = dt.position.top + "px";
            $scope.$apply();
        });

    });
