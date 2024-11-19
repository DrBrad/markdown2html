function markdownToHtml(markdown){
    if(markdown.includes('<')){
        let cursor = 0;

        while(markdown.includes('<', cursor)){
            const start = markdown.indexOf('<', cursor);
            const end = markdown.indexOf('>', start+1);
            
            if(end === -1){
                break;
            }
            
            let tagText = markdown.substring(start+1, end);
            if(tagText.includes('<')){
                let subCursor = 0;
                while(tagText.includes('<', subCursor)){
                    const start = tagText.indexOf('<', cursor);
                    tagText = tagText.slice(0, start)+'&lt;'+tagText.slice(start+1);
                }
            }
            markdown = markdown.slice(0, start)+`&lt;${tagText}&gt;`+markdown.slice(end+1);
        }
    }

    const paragraphs = markdown.split('\n\n');
    let inCodeBlock = false;

    const htmlParagraphs = paragraphs.map((paragraph) => {
        const lines = paragraph.split('\n');
        let processedLines = [];
        let i = 0;
        
        while(i < lines.length){
            let line = lines[i];

            if(line.endsWith('  ')){
                line = line.slice(0, line.length-2)+'<br>';
            }
            
            //HANDLE CODE BLOCKS
            if(line.startsWith('```')){
                inCodeBlock = !inCodeBlock;

                if(inCodeBlock){
                    const previousLine = lines[i+1];
                    processedLines.push('<pre><code>'+previousLine);
                    i += 2;
                    continue;
                }

                processedLines[processedLines.length-1] = processedLines[processedLines.length-1]+'</code></pre>';
                i++;
                continue;
            }
            
            if(inCodeBlock){
                processedLines.push(line);
                i++;
                continue;
            }

            //HANDLE BULLET LISTS
            if(line.startsWith('- ')){
                processedLines.push(`<li>${line.slice(2)}</li>`);
                i++;
                continue;
            }

            //HANDLE BLOCKQUOTES
            if(line.startsWith('> ')){
                processedLines.push(`<blockquote>${line.slice(2)}</blockquote>`);
                i++;
                continue;
            }

            //HANDLE UNDERLINES FOR H1 & H2
            if(i < lines.length){
                let nextLine = lines[i+1];

                if(typeof nextLine != 'undefined'){
                    nextLine = lines[i+1].trim();

                    if(/^=+$/.test(nextLine)){
                        lines[i+1] = '';
                        processedLines.push(`<h1>${line}</h1>`);
                        i++;
                        continue;
    
                    }else if(/^-+$/.test(nextLine)){
                        lines[i+1] = '';
                        processedLines.push(`<h2>${line}</h2>`);
                        i++;
                        continue;
                    }
                }
            }

            //HANDLE HEADERS
            if(line.startsWith('### ')){
                processedLines.push(`<h3>${line.slice(4)}</h3>`);
                i++;
                continue;

            }else if(line.startsWith('## ')){
                processedLines.push(`<h2>${line.slice(3)}</h2>`);
                i++;
                continue;

            }else if(line.startsWith('# ')){
                processedLines.push(`<h1>${line.slice(2)}</h1>`);
                i++;
                continue;
            }

            line = markDownText(line);

            //HANDLE EXAMPLE
            if(line.includes('`')){
                while(line.includes('`')){
                    const start = line.indexOf('`');
                    const end = line.indexOf('`', start+1);

                    if(end === -1){
                        break;
                    }

                    const italicText = line.substring(start+1, end);
                    line = line.slice(0, start)+`<code>${italicText}</code>`+line.slice(end + 1);
                }
            }

            processedLines.push(line);
            i++;
        }

        //HANDLE TABLE
        if(lines.some((line) => line.startsWith('|'))){
            let tableHtml = '<table>';
            let isHeaderRow = true;
            let bodyHtml = '';
        
            lines.forEach((tableLine, index) => {
                if(tableLine.startsWith('|')){
                    const cells = tableLine.split('|').map(cell => cell.trim());
                    const filteredCells = cells.filter(cell => cell !== '');

                    if(index > 0 && filteredCells.every(cell => /^-+$/.test(cell))){
                        return;
                    }
        
                    if(isHeaderRow){
                        tableHtml += '<thead><tr>';
                        filteredCells.forEach(cell => {
                            tableHtml += '<th>'+markDownText(cell)+'</th>';
                        });
                        tableHtml += '</tr></thead>';
                        isHeaderRow = false;

                    }else{
                        bodyHtml += '<tr>';
                        filteredCells.forEach(cell => {
                            bodyHtml += '<td>'+markDownText(cell)+'</td>';
                        });
                        bodyHtml += '</tr>';
                    }
                }
            });
        
            if(bodyHtml){
                tableHtml += `<tbody>${bodyHtml}</tbody>`;
            }
            
            tableHtml += '</table>';
            return tableHtml;
        }

        //HANDLE LIST WRAPPING
        const isList = processedLines.every(line => line.startsWith('<li>'));
        if(isList){
            return `<ul>${processedLines.join('')}</ul>`;
        }

        const joinedLines = processedLines.join('\n');
        if(!inCodeBlock && !joinedLines.startsWith('<h') && !joinedLines.startsWith('<pre>')){
            return `<p>${joinedLines}</p>`;
        }

        return joinedLines;
    });

    return htmlParagraphs.join('\n\n');
}

function markDownText(line){
    //HANDLE IMAGES
    while(line.includes('![') && line.includes('](')){
        const startText = line.indexOf('![');
        const endText = line.indexOf('](', startText);
        const startUrl = line.indexOf('(', endText);
        const endUrl = line.indexOf(')', startUrl);

        if(startText !== -1 && endText !== -1 && startUrl !== -1 && endUrl !== -1){
            const linkText = line.substring(startText+1, endText);
            const url = line.substring(startUrl+1, endUrl);
            const linkHtml = `<img src="${url}">`;

            line = line.slice(0, startText)+linkHtml+line.slice(endUrl+1);

        }else{
            break;
        }
    }

    //HANDLE LINKS
    while(line.includes('[') && line.includes('](')){
        const startText = line.indexOf('[');
        const endText = line.indexOf('](', startText);
        const startUrl = line.indexOf('(', endText);
        const endUrl = line.indexOf(')', startUrl);

        if(startText !== -1 && endText !== -1 && startUrl !== -1 && endUrl !== -1){
            const linkText = line.substring(startText+1, endText);
            const url = line.substring(startUrl+1, endUrl);
            const linkHtml = `<a href="${url}">${linkText}</a>`;

            line = line.slice(0, startText)+linkHtml+line.slice(endUrl+1);

        }else{
            break;
        }
    }

    //HANDLE BOLD
    if(line.includes('**')){
        while(line.includes('**')){
            const start = line.indexOf('**');
            const end = line.indexOf('**', start+2);

            if(end === -1){
                break;
            }

            const boldText = line.substring(start+2, end);
            line = line.slice(0, start)+`<strong>${boldText}</strong>`+line.slice(end + 2);
        }
    }

    //HANDLE ITALIC
    if(line.includes('*')){
        while(line.includes('*')){
            const start = line.indexOf('*');
            const end = line.indexOf('*', start+1);

            if(end === -1){
                break;
            }

            const italicText = line.substring(start+1, end);
            line = line.slice(0, start)+`<em>${italicText}</em>`+line.slice(end + 1);
        }
    }

    return line;
}
