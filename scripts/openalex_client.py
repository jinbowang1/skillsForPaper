#!/usr/bin/env python3
"""OpenAlex API client for literature search."""

import requests
import time
import urllib.parse

class OpenAlexClient:
    BASE_URL = "https://api.openalex.org"
    
    def __init__(self, email: str = "research@example.edu"):
        self.email = email
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
    
    def _make_request(self, endpoint: str, params: dict = None) -> dict:
        url = f"{self.BASE_URL}{endpoint}"
        params = params or {}
        params["mailto"] = self.email
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        time.sleep(0.2)
        return response.json()
    
    def search_works(self, search: str, year_filter: str = None, 
                     sort: str = None, per_page: int = 50) -> list:
        params = {"search": search, "per-page": per_page}
        
        if year_filter:
            params["filter"] = f"publication_year:{year_filter}"
        if sort:
            params["sort"] = sort
        
        print(f"API URL: {self.BASE_URL}/works?{urllib.parse.urlencode(params, doseq=True)[:100]}...")
        data = self._make_request("/works", params)
        return data.get("results", [])

def search_literature(topic: str, years: str = ">2022", limit: int = 30):
    """Search for literature on a topic."""
    client = OpenAlexClient()
    results = client.search_works(
        search=topic,
        year_filter=years,
        sort="cited_by_count:desc"
    )
    return results[:limit]

if __name__ == "__main__":
    import json
    client = OpenAlexClient()
    
    # Test with simple query
    print("测试搜索...")
    results = client.search_works(
        search="continual learning",
        year_filter=">2023",
        sort="cited_by_count:desc",
        per_page=5
    )
    print(f"找到 {len(results)} 篇文献")
    for r in results[:3]:
        print(f"- {r.get('title', 'N/A')}")
