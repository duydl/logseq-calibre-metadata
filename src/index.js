import "@logseq/libs";
import { clearDriftless, setDriftlessTimeout } from "driftless";
import Fuse from "fuse.js";


const settings = [
    {
        key: "calibreLibrary",
        title: "Preferred Calibre Library",
        description: "Set your preferred Calibre library location.",
        type: "string",
        default: ""
    },
    {
        key: "addBlockInstead",
        title: "Add a new block at cursor instead of line to new page",
        type: "boolean",
        default: false
    },
    {
        key: "serverLink",
        title: "Content Server Link",
        description: "Specify the link to your content server. The default is localhost:8080, but change it if you use a different port or domain. <br>Add the link WITHOUT the extra /; otherwise it could result in error. <br>If update to library isn't registered, use the link for local home network device i.e the one displayed when clicking on Connect/share in Calibre to avoid the cache problem. ",
        type: "string",
        default: "http://localhost:8080"
    },
    {
        key: "pageTitleTemplate",
        title: "Page Title Template",
        description: "Define the template for new Calibre page titles. The default template is 'calibre/{{title}} - {{authors}} ({{date}})'.",
        type: "string",
        default: "calibre/{{title}} - {{authors}} ({{date}})"
    },
    {
        key: "pageProperties",
        title: "Page Properties",
        description: "Select the properties i.e metadata to be included in the new Calibre page. Note that the rating property currently returns an error. The default metadata is 'tags, isbn, date, publisher, language, authors, format'.",
        type: "string",
        default: "tags, isbn, date, publisher, language, authors, format"
    },
    {
        key: "bookFormat",
        title: "Preferred Book Format for Renderers",
        description: "Choose your preferred book format for Viewer Macro and Sync Macro. The default is epub.",
        type: "string",
        default: "epub"
    },
];

logseq.useSettingsSchema(settings);


const search_bar = document.getElementById("search-bar");
let search_results_item_container = document.getElementById("search-results");
let typingTimer; // Must set global var for DriftlessTime

// Display search results when typing stops
search_bar.addEventListener("input", () => {
    clearSearchResults();
    clearDriftless(typingTimer);
    typingTimer = setDriftlessTimeout(() => getCalibreItems(search_bar.value), 750);
});


// const username = '';
// const passwordd = '';

// const credentials = new Headers({
//     'Authorization': 'Basic ' + btoa(`${username}:${passwordd}`),
//   });


function getCalibreItems(search_input) {
    const fetch_link = logseq.settings.serverLink + "/ajax/books/" + logseq.settings.calibreLibrary
    console.log(fetch_link)
    let search_results;
    fetch(fetch_link, 
        // {
        // method: 'GET',
        // credentials: 'include',
        // headers: credentials
        // }
    )
    .then(response => {
        if (!response.ok) {
            logseq.UI.showMsg('calibreMetadata: Fail to fetch from Calibre API. Make sure to start the Content Server.');
            console.log(response)
            return
        }
        return response.json();})
    .then(data => {
            const books = [];
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    books.push(data[key])
                }
            }
            // Search for calibre items with fuse.js
            const options = {
                threshold: 0.2,
                keys: ["title", "authors"],
                distance: 1000
            };
            const fuse = new Fuse(books, options);
            search_results = fuse.search(search_input);

            searchCalibreItems(search_results);
        })
}


function setAttributes(element, attrs) {
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function exitSearch() {
    logseq.hideMainUI();
    search_bar.value = "";
    search_bar.blur();
    clearSearchResults();
}

function clearSearchResults() {
    if (search_results_item_container.children.length > 0) {
        for (let i = 0; i < search_results_item_container.children.length; i++) {
            (search_results_item_container.children[i]).remove();
            clearSearchResults();
        }
    }
}

// search_results: a list of dictionaries with one key "item" and value metadata of 1 book.
function searchCalibreItems(search_results) {

    let calibre_item;
    let calibre_item_key;
    let calibre_item_title;
    let calibre_item_authors;
    let calibre_item_date;

    let search_result_container;
    let search_result_title_container;
    let search_result_title;
    let search_result_description_container;
    let search_result_description;

            
    if (search_results.length > 0) {
        // display search results
        for (let i = 0; i < search_results.length; i++) {
            
            calibre_item = search_results[i].item; // fuse.js return in the form [item: {} , etc..]

            calibre_item_key = calibre_item.application_id;
            calibre_item_title = calibre_item.title;
            calibre_item_authors = calibre_item.authors.join(" & ")
            calibre_item_date = calibre_item.pubdate.substring(0, 4)

            const hr = document.createElement("hr");

            search_result_container = document.createElement("li");
            search_result_container.id = calibre_item_key;

            search_result_title_container = document.createElement("div");
            search_result_title_container.id = calibre_item_key;
            search_result_title = document.createTextNode(`${calibre_item_title} `);

            search_result_description_container = document.createElement("div");
            search_result_description_container.id = calibre_item_key;
            search_result_description = document.createTextNode(`${calibre_item_authors} (${calibre_item_date})`);

            setAttributes(search_result_container, {
                "class": "search-result",
                "style": "cursor: pointer;"
            });
            setAttributes(search_result_title_container, {
                "class": "title"
            });
            setAttributes(search_result_description_container, {
                "class": "info"
            });
            search_result_container.addEventListener("click", function (e) {
                let selected_item;
                // Iterate through the list and find the inner dictionary with application_id = e.srcElement.id
                for (const search_result of search_results) {
                    if (search_result.item && search_result.item.application_id == e.srcElement.id) {
                        selected_item = search_result.item;
                        break; // Exit the loop once the desired dictionary is found
                    }
                }
                exitSearch();
                createCalibrePage(selected_item);
            });
            search_result_title_container.appendChild(search_result_title);
            search_result_description_container.appendChild(search_result_description);

            search_result_container.append(search_result_title_container, search_result_description_container);

            // Append <hr> except for the last item
            (i != (search_results.length - 1)) ? search_results_item_container.append(search_result_container, hr) : search_results_item_container.append(search_result_container);
        }
    }
    
    else if ((search_results.length == 0) && (search_bar.value != "")) {
        // Not found
        search_result_container = document.createElement("li");
        search_result_title_container = document.createElement("div");
        search_result_title = document.createTextNode("Not found");

        setAttributes(search_result_title_container, {
            "class": "title"
        });

        search_result_title_container.appendChild(search_result_title);
        search_result_container.append(search_result_title_container);
        search_results_item_container.append(search_result_container);
    }
}

function createCalibrePage(item) {
    
    const calibre_item = item;

    let page_title = logseq.settings.pageTitleTemplate;
    let page_title_variables = page_title.match(/({{[\s\S]*?}})/gm);

    page_title_variables.forEach(page_title_var => {
        switch (page_title_var) {

            case "{{authors}}":
            (calibre_item.authors) ? page_title = page_title.replace("{{authors}}", calibre_item.authors.join(" & ")) : page_title = page_title;
            break;

            case "{{title}}":
            (calibre_item.title) ? page_title = page_title.replace(page_title_var, calibre_item.title) : page_title = page_title.replace(page_title_var, "NA");
            break;

            case "{{date}}":
            (calibre_item.pubdate) ? page_title = page_title.replace(page_title_var, calibre_item.pubdate.substring(0, 4)) : page_title = page_title;
            break;
        }
    });

    let property_value;
    let page_properties_keys = logseq.settings.pageProperties.split(",");
    let page_properties = {};

    // // Add Everything 
    // for (let [key, value] of Object.entries(calibre_item)) {
    //     (value) ? page_properties[key] = `"${value}"` : page_properties[key] = "NA";
    // }
    
    page_properties_keys.forEach((property) => {
        property = property.trim()
        switch (property) {
            case "tags":
            property_value = calibre_item.tags;
            break;

            case "isbn":
            property_value = calibre_item.identifiers.isbn;
            break;

            case "date":
            property_value = calibre_item.pubdate.substring(0, 4);
            break;

            case "publisher":
            property_value = calibre_item.publisher;
            break;
            
            case "languages":
            property_value = calibre_item.languages;
            break;

            case "authors":
            property_value = calibre_item.authors.map(author => `[[${author}]]`).join(', ');;
            break;

            case "format":
            property_value = Object.entries(calibre_item.format_metadata)
            .map(([ext, obj]) => `[${ext}](${obj.path})`)
            .join(', ');
            break;

            default:
            property_value = calibre_item[property];
        }
        
        page_properties[property] = property_value ? property_value : "NA";
        });

        console.log("Create Page");
        create(page_title, page_properties, calibre_item).then(() => {
    });

}


async function create(page_title, page_properties, calibre_item) {

    if (logseq.settings.addBlockInstead) {
        
        const currentBlock = await logseq.Editor.getCurrentBlock()
        const newBlock = await logseq.Editor.insertBlock(currentBlock.uuid, `${page_title}`, {
            before: true,
            focus: true,
            isPageBlock: true,
            properties: page_properties,
        })
        
        // await logseq.Editor.insertAtEditingCursor(`${page_title}`);
        // Object.entries(page_properties).forEach(([key, value]) => logseq.Editor.upsertBlockProperty(currentBlock.uuid, key, value))

        const synopsisBlock = await logseq.Editor.insertBlock(newBlock.uuid, "[[Synopsis]]");

        await logseq.Editor.insertBlock(synopsisBlock.uuid, calibre_item?.comments? calibre_item?.comments : "");
        

        // Append two MacroRenderers for View and Sync in calibre-annotation Plugin
        await logseq.Editor.insertBlock(newBlock.uuid, `[${calibre_item.title}](calibre://show-book/${logseq.settings.calibreLibrary}/${calibre_item.application_id})  {{renderer calibreViewer, special, ${logseq.settings.serverLink}/#book_id=${calibre_item.application_id}&fmt=${logseq.settings.bookFormat}&library_id=${logseq.settings.calibreLibrary}&mode=read_book}} {{renderer calibreHighlight, false, 2000, ${logseq.settings.serverLink}, ${logseq.settings.calibreLibrary}, ${calibre_item.application_id}, ${logseq.settings.bookFormat}}}`);
    }
    else {
        const newPage = await logseq.Editor.createPage(page_title, page_properties, {
            format: "markdown",
            redirect: false,
            journal: false,
            createFirstBlock: false
        });

        logseq.Editor.insertAtEditingCursor(`[[${page_title}]]`);
        logseq.Editor.exitEditingMode();


        const synopsisBlock = await logseq.Editor.appendBlockInPage(newPage.uuid, "[[Synopsis]]");

        await logseq.Editor.insertBlock(synopsisBlock.uuid, calibre_item?.comments? calibre_item?.comments : "");

        // Append two MacroRenderers for View and Sync in calibre-annotation Plugin
        await logseq.Editor.prependBlockInPage(newPage.uuid, `[${calibre_item.title}](calibre://show-book/${logseq.settings.calibreLibrary}/${calibre_item.application_id})  {{renderer calibreViewer, special, ${logseq.settings.serverLink}/#book_id=${calibre_item.application_id}&fmt=${logseq.settings.bookFormat}&library_id=${logseq.settings.calibreLibrary}&mode=read_book}} {{renderer calibreHighlight, false, 2000, ${logseq.settings.serverLink}, ${logseq.settings.calibreLibrary}, ${calibre_item.application_id}, ${logseq.settings.bookFormat}}}`);
    }

}



const main = () => {
    console.log("=== logseq-calibre-metadata Plugin Loaded ===");

    logseq.App.getUserConfigs().then(configs => {
        (configs.preferredThemeMode == "dark") ? document.body.className = "dark-theme" : document.body.className = "light-theme";
    });

    logseq.App.onThemeModeChanged((updated_theme) => {
        (updated_theme.mode == "dark") ? document.body.className = "dark-theme" : document.body.className = "light-theme";
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest("div")) {
            exitSearch();
        }
    });

    // use the escape key to hide the plugin UI
    document.addEventListener("keydown", function (e) {
        if (e.key == "Escape") {
            exitSearch();
        }
    });

    logseq.setMainUIInlineStyle({
        position: "absolute",
        backgroundColor: "transparent",
        top: "2.5em",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0.5em",
        width: "100vw",
        height: "100vh",
        overflow: "auto",
        zIndex: 100
    });

    logseq.provideModel({
        show_settings() {
            logseq.showSettingsUI();
        }
    });

    // toolbar icon
    logseq.App.registerUIItem("toolbar", {
        key: "logseg-calibre-metadata",
        template:
            `<a data-on-click="show_settings" class="button">
                <svg id="calibre-icon" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-letter-c" width="20" height="20" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M17 4H12 C11 3 7 6 7 12 C7 18 11 21 12 20 H17" />
                </svg>
            </a>`
    });

    // slash command
    logseq.Editor.registerSlashCommand("Calibre: Add a Calibre book", async () => {
        if (!logseq.settings.calibreLibrary) {
            logseq.UI.showMsg("calibreMetadata: SET CALIBRE LIBRARY") 
            return
        }
        logseq.showMainUI();
        search_bar.focus();
    });
}

logseq.ready(main).catch(console.error);