from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import re
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_elem in root.findall('atom:entry', ns):
            title = entry_elem.find('atom:title', ns)
            title_text = title.text if title is not None else ""
            
            updated = entry_elem.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""
            
            link_elem = entry_elem.find('atom:link', ns)
            link_url = ""
            if link_elem is not None:
                link_url = link_elem.attrib.get('href', "")
                
            content_elem = entry_elem.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            entries.append({
                'date': title_text,
                'updated': updated_text,
                'link': link_url,
                'raw_content': content_html
            })
            
        parsed_items = []
        item_id = 1
        for entry in entries:
            date = entry['date']
            raw_html = entry['raw_content']
            link = entry['link']
            
            # Extract sections by <h3>...</h3>
            pattern = r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)'
            matches = re.findall(pattern, raw_html, re.DOTALL)
            
            if not matches:
                parsed_items.append({
                    'id': item_id,
                    'date': date,
                    'type': 'General',
                    'description': raw_html.strip(),
                    'link': link
                })
                item_id += 1
            else:
                for match_type, match_content in matches:
                    parsed_items.append({
                        'id': item_id,
                        'date': date,
                        'type': match_type.strip(),
                        'description': match_content.strip(),
                        'link': link
                    })
                    item_id += 1
                    
        return parsed_items, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    notes, error = fetch_and_parse_feed()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({'success': True, 'notes': notes})

if __name__ == '__main__':
    # Using 127.0.0.1 for local execution
    app.run(host='127.0.0.1', port=5000, debug=True)
