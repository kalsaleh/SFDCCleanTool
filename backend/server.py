from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import json
import re
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

app = FastAPI(title="Domain Enrichment API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


class EnrichmentRequest(BaseModel):
    domain: str
    provider: str  # 'openai', 'claude', 'perplexica'
    fields: List[str]  # List of fields to enrich: industry, vertical, employees, hq, founded, revenue, funding, funding_type
    custom_api_key: Optional[str] = None
    perplexica_url: Optional[str] = None


class EnrichmentResponse(BaseModel):
    domain: str
    companyName: Optional[str] = None
    normalizedDomain: str
    success: bool
    error: Optional[str] = None
    headquarters: Optional[str] = None
    hqCountry: Optional[str] = None
    description: Optional[str] = None
    shortDescription: Optional[str] = None
    industry: Optional[str] = None
    vertical: Optional[str] = None
    employeeCount: Optional[str] = None
    revenue: Optional[str] = None
    founded: Optional[str] = None
    foundedCountry: Optional[str] = None
    funding: Optional[str] = None
    fundingType: Optional[str] = None
    fundingStage: Optional[str] = None
    businessType: Optional[str] = None
    revenueModel: Optional[str] = None
    companyStage: Optional[str] = None
    provider: str
    founded: Optional[str] = None
    funding: Optional[str] = None
    fundingType: Optional[str] = None
    provider: str


class ConfigResponse(BaseModel):
    has_emergent_key: bool
    has_openai_key: bool
    has_anthropic_key: bool
    available_providers: List[str]


def normalize_domain(domain: str) -> str:
    """Normalize domain by removing www and converting to lowercase."""
    return domain.lower().replace("www.", "")


def build_prompt(domain: str, fields: List[str]) -> str:
    """Build enrichment prompt based on selected fields."""
    field_descriptions = {
        "industry": "**industry**: Be specific (e.g., 'Enterprise SaaS - Customer Relationship Management' not just 'Software')",
        "vertical": "**vertical**: The specific market vertical or sector they serve (e.g., 'Healthcare Technology', 'Financial Services', 'E-commerce')",
        "employees": "**employeeCount**: Research current count, use ranges: '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'",
        "hq": "**headquarters**: Full address format 'City, State/Province, Country' (e.g., 'San Francisco, California, USA')",
        "hq_country": "**hqCountry**: Country where headquarters is located (e.g., 'USA', 'United Kingdom', 'Germany')",
        "description": "**description**: Write 2-3 detailed sentences covering what products/services they offer and their target market",
        "short_description": "**shortDescription**: Write 1 concise sentence (max 15 words) describing what the company does",
        "founded": "**founded**: Exact founding year if available (e.g., '2010')",
        "founded_country": "**foundedCountry**: Country where the company was founded (e.g., 'USA', 'United Kingdom', 'China')",
        "revenue": "**revenue**: Annual revenue with currency if available, use ranges: '<$1M', '$1M-5M', '$5M-10M', '$10M-50M', '$50M-100M', '$100M-500M', '$500M-1B', '$1B+'",
        "funding": "**funding**: Total funding raised if available (e.g., '$50M', '$100M', 'Bootstrapped')",
        "funding_type": "**fundingType**: Latest funding round type if available (e.g., 'Series A', 'Series B', 'IPO', 'Acquired', 'Bootstrapped')",
        "funding_stage": "**fundingStage**: Current funding stage, choose from: 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F', 'Series G', 'Growth', 'Established', 'Unknown', 'N/A', 'None', 'Not Applicable'",
        "business_type": "**businessType**: Classify as one of: 'Digital Native' (born in cloud, selling primarily digitally), 'Digitally Transformed' (traditional business adapted to digital), or 'Traditional' (primarily offline/physical operations)",
        "revenue_model": "**revenueModel**: Primary revenue model (e.g., 'Subscription', 'B2B Sales', 'B2C Sales', 'Commission', 'Transaction Fees', 'Advertising', 'Freemium', 'Marketplace', 'Licensing', 'Hybrid')",
        "company_stage": "**companyStage**: Company maturity stage, choose from: 'Startup' (early stage, scaling), 'Growth' (rapidly expanding), or 'Established' (mature, stable operations)"
    }
    
    selected_fields = [field_descriptions[field] for field in fields if field in field_descriptions]
    
    prompt = f'''Research the company with domain "{domain}" thoroughly. Visit their website, check company databases, and recent news. Provide comprehensive, specific information:

1. **companyName**: Full official company name (legal name if different from brand)
'''
    
    for i, field_desc in enumerate(selected_fields, start=2):
        prompt += f"{i}. {field_desc}\n"
    
    prompt += "\nReturn ONLY valid JSON with the requested fields. Be thorough and specific. If a field is not available, omit it from the response or use null."
    
    return prompt


async def enrich_with_openai(domain: str, fields: List[str], api_key: str) -> EnrichmentResponse:
    """Enrich domain using OpenAI API via emergentintegrations."""
    prompt = build_prompt(domain, fields)
    
    try:
        # Initialize LlmChat with emergentintegrations
        chat = LlmChat(
            api_key=api_key,
            session_id=f"enrichment-{domain}",
            system_message="You are an expert business intelligence researcher with access to comprehensive company databases and web search. Your task is to find detailed, accurate, and current information about companies. Return only valid JSON."
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=prompt)
        
        # Send message and get response
        content = await chat.send_message(user_message)
        
        if not content:
            raise HTTPException(status_code=500, detail="No content in OpenAI response")
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                # Try to parse the whole content as JSON
                parsed = json.loads(content)
            else:
                parsed = json.loads(json_match.group(0))
            
            return EnrichmentResponse(
                domain=domain,
                companyName=parsed.get("companyName"),
                normalizedDomain=normalize_domain(domain),
                success=True,
                headquarters=parsed.get("headquarters"),
                hqCountry=parsed.get("hqCountry"),
                description=parsed.get("description"),
                shortDescription=parsed.get("shortDescription"),
                industry=parsed.get("industry"),
                vertical=parsed.get("vertical"),
                employeeCount=parsed.get("employeeCount"),
                revenue=parsed.get("revenue"),
                founded=parsed.get("founded"),
                foundedCountry=parsed.get("foundedCountry"),
                funding=parsed.get("funding"),
                fundingType=parsed.get("fundingType"),
                fundingStage=parsed.get("fundingStage"),
                businessType=parsed.get("businessType"),
                revenueModel=parsed.get("revenueModel"),
                companyStage=parsed.get("companyStage"),
                provider="openai"
            )
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse OpenAI response: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI enrichment error: {str(e)}")


async def enrich_with_claude(domain: str, fields: List[str], api_key: str) -> EnrichmentResponse:
    """Enrich domain using Claude API via emergentintegrations."""
    prompt = build_prompt(domain, fields)
    
    try:
        # Initialize LlmChat with emergentintegrations
        chat = LlmChat(
            api_key=api_key,
            session_id=f"enrichment-{domain}",
            system_message="You are an expert business intelligence researcher. Find detailed, accurate information about companies and return valid JSON only."
        ).with_model("anthropic", "claude-3-7-sonnet-20250219")
        
        # Create user message
        user_message = UserMessage(text=prompt)
        
        # Send message and get response
        content = await chat.send_message(user_message)
        
        if not content:
            raise HTTPException(status_code=500, detail="No content in Claude response")
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                parsed = json.loads(content)
            else:
                parsed = json.loads(json_match.group(0))
            
            return EnrichmentResponse(
                domain=domain,
                companyName=parsed.get("companyName"),
                normalizedDomain=normalize_domain(domain),
                success=True,
                headquarters=parsed.get("headquarters"),
                hqCountry=parsed.get("hqCountry"),
                description=parsed.get("description"),
                shortDescription=parsed.get("shortDescription"),
                industry=parsed.get("industry"),
                vertical=parsed.get("vertical"),
                employeeCount=parsed.get("employeeCount"),
                revenue=parsed.get("revenue"),
                founded=parsed.get("founded"),
                foundedCountry=parsed.get("foundedCountry"),
                funding=parsed.get("funding"),
                fundingType=parsed.get("fundingType"),
                fundingStage=parsed.get("fundingStage"),
                businessType=parsed.get("businessType"),
                revenueModel=parsed.get("revenueModel"),
                companyStage=parsed.get("companyStage"),
                provider="claude"
            )
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse Claude response: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude enrichment error: {str(e)}")


async def enrich_with_perplexica(domain: str, fields: List[str], perplexica_url: str) -> EnrichmentResponse:
    """Enrich domain using Perplexica API."""
    prompt = build_prompt(domain, fields)
    
    api_url = perplexica_url.rstrip('/') + '/api/search'
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_url,
                headers={"Content-Type": "application/json"},
                json={
                    "focusMode": "webSearch",
                    "query": prompt,
                    "stream": False
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Perplexica API error: {response.text}")
            
            data = response.json()
            content = data.get("message", "")
            
            if not content:
                raise HTTPException(status_code=500, detail="No content in Perplexica response")
            
            try:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    return EnrichmentResponse(
                        domain=domain,
                        companyName=parsed.get("companyName"),
                        normalizedDomain=normalize_domain(domain),
                        success=True,
                        headquarters=parsed.get("headquarters"),
                        description=parsed.get("description"),
                        industry=parsed.get("industry"),
                        vertical=parsed.get("vertical"),
                        employeeCount=parsed.get("employeeCount"),
                        revenue=parsed.get("revenue"),
                        founded=parsed.get("founded"),
                        funding=parsed.get("funding"),
                        fundingType=parsed.get("fundingType"),
                        provider="perplexica"
                    )
                else:
                    # If no JSON, return basic info
                    return EnrichmentResponse(
                        domain=domain,
                        companyName=None,
                        normalizedDomain=normalize_domain(domain),
                        success=False,
                        description=content[:200],
                        error="Could not parse structured response",
                        provider="perplexica"
                    )
            except json.JSONDecodeError:
                return EnrichmentResponse(
                    domain=domain,
                    companyName=None,
                    normalizedDomain=normalize_domain(domain),
                    success=False,
                    error="Failed to parse Perplexica response",
                    provider="perplexica"
                )
                
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Perplexica API timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "Domain Enrichment API", "version": "1.0.0"}


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """Get API configuration and available providers."""
    has_emergent = bool(EMERGENT_LLM_KEY)
    has_openai = bool(OPENAI_API_KEY)
    has_anthropic = bool(ANTHROPIC_API_KEY)
    
    available_providers = []
    if has_emergent or has_openai:
        available_providers.append("openai")
    if has_emergent or has_anthropic:
        available_providers.append("claude")
    available_providers.append("perplexica")  # Always available if user provides URL
    
    return ConfigResponse(
        has_emergent_key=has_emergent,
        has_openai_key=has_openai,
        has_anthropic_key=has_anthropic,
        available_providers=available_providers
    )


@app.post("/api/enrich", response_model=EnrichmentResponse)
async def enrich_domain(request: EnrichmentRequest):
    """Enrich a domain with company information."""
    
    # Determine which API key to use
    if request.provider == "openai":
        api_key = request.custom_api_key or OPENAI_API_KEY or EMERGENT_LLM_KEY
        if not api_key:
            raise HTTPException(status_code=400, detail="No API key available for OpenAI")
        return await enrich_with_openai(request.domain, request.fields, api_key)
    
    elif request.provider == "claude":
        api_key = request.custom_api_key or ANTHROPIC_API_KEY or EMERGENT_LLM_KEY
        if not api_key:
            raise HTTPException(status_code=400, detail="No API key available for Claude")
        return await enrich_with_claude(request.domain, request.fields, api_key)
    
    elif request.provider == "perplexica":
        if not request.perplexica_url:
            raise HTTPException(status_code=400, detail="Perplexica URL is required")
        return await enrich_with_perplexica(request.domain, request.fields, request.perplexica_url)
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)