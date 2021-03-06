const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const dataFolderPath = path.join(__dirname, './data/');
const inputFolderPath = path.join(__dirname, './data/input/');
const outputFolderPath = path.join(__dirname, './data/output/');
const excelUploadsFolderPath = path.join(__dirname, './data/excel_uploads');
const ignoreListFilePath = path.join(__dirname, './data/ignoreList.json');

class Abbreviation {
    constructor() {
        this.scriptLogData = [];
        this.SCRIPT_ANALYTICS = [];
        this.inputFileContent = '';
        this.USER_TOKEN = '';
        this.USER_INPUT_FILE_PATH = '';
        this.ABBR_LIST = [];
        this.EXCEL_DATA = [];

        // Read the ignoreList JSON contents
        this.ignoreList = this.readIgnoreList();

        // create required folder structure if not present
        this.createRequireFolderStructure();
    }

    initializeScriptAnalytics() {
        this.SCRIPT_ANALYTICS.TOTAL_EXECUTION_TIME = 0;
        this.SCRIPT_ANALYTICS.TOTAL_ABBREVIATIONS = 0;
    }

    scriptLog(msg) {
        this.scriptLogData.push(msg);
    }

    createRequireFolderStructure() {
        const requiredFolders = [];
        requiredFolders.push(dataFolderPath);
        requiredFolders.push(inputFolderPath);
        requiredFolders.push(outputFolderPath);
        requiredFolders.push(excelUploadsFolderPath);

        requiredFolders.forEach(folder => {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }
        });
    }

    execute(userToken) {
        this.scriptLog('Starting execution of script');
        console.log(userToken);

        // initialize
        this.initializeScriptAnalytics();

        // Set user token
        this.USER_TOKEN = userToken;

        // Set user file path 
        this.USER_INPUT_FILE_PATH = path.join(inputFolderPath, `./${this.USER_TOKEN}.html`);
        this.USER_OUTPUT_FILE_PATH = path.join(outputFolderPath, `./${this.USER_TOKEN}.html`);

        //Read input file
        this.inputFileContent = this.readInputFileSync();

        // Process this file content to extract abbreviations from it
        this.ABBR_LIST = this.extractAbbreviations();

        // Script log clear
        this.clearScriptLog();
        return true;
    }

    clearScriptLog() {
        this.scriptLogData = [];
    }

    extractAbbreviations() {
        if (this.inputFileContent !== '') {
            console.log(this.ignoreList);
            let content = this.inputFileContent;

            // Following regex is used to extract the text inside the body tag; including the body tags
            var extractBodyContentPattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
            var array_matches = extractBodyContentPattern.exec(content);
            if (array_matches != null) {
                let bodyContent = array_matches[1];

                // Remove &shy; hyphenations from the content first
                bodyContent = this.removeHyphenations(bodyContent);

                // Following regex is used to extract 2 or more lettered CAPTIAL only words; which are not inside any <> html tags
                var extractWordsPattern = /\b[A-Z]{2,5}\b|\b[A-Z]{5}\b/g;
                let abbr_list = bodyContent.match(extractWordsPattern);

                // Filter our abbreviations array wrt ignore list array
                abbr_list = this.filterAbbreviations(abbr_list);

                // Remove duplicate abbreviations from the ABBR LIST
                abbr_list = this.filterDuplicates(abbr_list);

                // Set the count of abbreviations retrieved
                this.SCRIPT_ANALYTICS.TOTAL_ABBREVIATIONS = abbr_list.length;

                return abbr_list;
            } else {
                this.scriptLog('There was no BODY content found in the HTML file.');
            }

        } else {
            this.scriptLog('Empty File Contents were found');
        }
    }

    readInputFileSync() {

        // Check if user token input file exists or not
        if (fs.existsSync(this.USER_INPUT_FILE_PATH)) {
            this.scriptLog('Reading input file now');

            // Read the contents of this data file
            let content = fs.readFileSync(this.USER_INPUT_FILE_PATH, 'utf8');
            // console.log(content);

            return content;

        } else {
            this.scriptLog('User input file was not found');
            return '';
        }

    }

    uploadFile(fileUploaded, oldpath, newpath) {
        try {
            let data = fs.readFileSync(oldpath);
            // Write the file
            fs.writeFileSync(newpath, data);

            // Delete the file
            fs.unlinkSync(oldpath);

            // Check if zip was successfully uploaded
            if (fs.existsSync(newpath)) {
                return true;
            } else {
                return false;
            }

            console.log('File uploaded');
        } catch (error) {

        }

    }

    readExcel(userToken) {
        this.USER_TOKEN = userToken;
        const excelFilePath = path.join(excelUploadsFolderPath, `${userToken}.xlsx`);

        // Check if uploaded excel file exists
        if (fs.existsSync(excelFilePath)) {
            var workbook = XLSX.readFile(excelFilePath);
            var sheet_name_list = workbook.SheetNames;
            var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
            this.EXCEL_DATA = xlData;
        } else {
            console.log('Uploaded Excel file not found');
        }

        return this.EXCEL_DATA;
    }

    getExcelData() {
        return this.EXCEL_DATA;
    }

    readIgnoreList() {
        const obj = JSON.parse(fs.readFileSync(ignoreListFilePath, 'utf8'));
        return obj;
    }

    getAbbrList() {
        return this.ABBR_LIST;
    }

    getAbbrJsonFormat() {
        const abbrJSON = [];
        this.ABBR_LIST.forEach(word => {
            let obj = {};
            obj.abbr = word;
            obj.description = '';
            abbrJSON.push(obj);
        });
        return abbrJSON;
    }

    filterAbbreviations(abbr_list) {
        let filtered = abbr_list.filter(
            function(e) {
                return this.indexOf(e) < 0;
            },
            this.ignoreList
        );

        return filtered;
    }

    filterDuplicates(abbr_list) {
        var uniques = [];
        abbr_list.forEach(element => {
            if (uniques.indexOf(element) === -1) uniques.push(element);
        });
        return uniques;
    }

    removeHyphenations(content) {
        const re = new RegExp('(&shy;+)', 'g');
        content = content.replace(re, ``);
        return content;
    }

    getScriptAnalytics() {
        return this.SCRIPT_ANALYTICS;
    }
}


let obj = new Abbreviation();

module.exports = obj;