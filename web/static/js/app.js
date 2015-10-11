import "deps/phoenix_html/web/static/js/phoenix_html"
import {Socket} from "deps/phoenix/web/static/js/phoenix/"

var socket = new Socket("/socket");
socket.connect();
var channel = socket.channel("editor:lobby", {});
channel.join();
// TODO: このタイミングで現時点でのコンテンツ内容を共有してもらう
// TODO: カーソルも join のタイミングで初期化したい
var cursors = {};

var editor = ace.edit("cm-editor"),
    // TODO: これは後でログイン的な機構で代替する
    userName = Math.random().toString(36).slice(-8);
var isFromMe = true;

editor.$blockScrolling = Infinity;

editor.on("change", function(e) {
    if (isFromMe) {
        channel.push("edit", { user: userName, event: e });
    }
});

editor.session.selection.on("changeCursor", function(e) {
    // getCursorPosition だと正確な絶対座標が割り出せないため、この方法をとります
    // .ace_text-input に座標が適応されるのに少しラグがあるので、100ms 遅延させます
    setTimeout(function() {
        channel.push("move", { user: userName, position: $(".ace_text-input").offset() });
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
    if (dt.user === userName) {
        return;
    }
    isFromMe = false;
    applyChangeEvent(dt.event);
});

channel.on("move", function(dt) {
    if (dt.user === userName) {
        return;
    }
    // TODO: 以下の処理は Angular 化する
    var cursor = null;
    if (!(dt.user in cursors)) {
        cursor = $("<div></div>");
        cursor.attr("id", "cm-cursor-" + dt.user)
            .addClass("cm-cursor");
        cursor.appendTo("body");
        cursors[dt.user] = cursor;
    } else {
        cursor = cursors[dt.user];
    }
    var position = dt.position;
    cursor.css("top", position.top + "px")
        .css("left", position.left + "px");
});
