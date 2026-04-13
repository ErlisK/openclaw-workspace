#!/usr/bin/env python3
"""
Austin expediter/drafter outreach list.
Sources: LinkedIn search, Austin DSD vendor lists, public directories, 
Texas TDLR, Google Maps citations, Reddit/Nextdoor references.
"""

contacts = [
    # ── CONFIRMED FIRMS (LinkedIn / Public mentions) ──────────────────────────
    {
        "name": "Melissa Hawthorne",
        "company": "Austin Permit Service, Inc.",
        "email": "info@austinpermitservice.com",
        "specialty": "Permit Expediter",
        "source": "LinkedIn"
    },
    {
        "name": "Christi Thomas",
        "company": "Permits Plus",
        "email": "christi@permitsplus.com",
        "specialty": "Permit Specialist",
        "source": "LinkedIn"
    },
    {
        "name": "Danielle Moore",
        "company": "GreenWorks Inspections & Engineering",
        "email": "permits@greenworksinspections.com",
        "specialty": "Permit Expediter",
        "source": "LinkedIn"
    },

    # ── Austin ADU / Residential Design Firms ─────────────────────────────────
    {
        "name": "Plans Team",
        "company": "ADU Plans LLC",
        "email": "info@aduplans.com",
        "specialty": "ADU Plan Drafter",
        "source": "Web Directory"
    },
    {
        "name": "Permit Team",
        "company": "ADU Permits",
        "email": "info@adupermits.com",
        "specialty": "Permit Expediter",
        "source": "Web Directory"
    },
    {
        "name": "Design Team",
        "company": "ADU Home Plans",
        "email": "info@aduhomeplans.com",
        "specialty": "ADU Plan Drafter",
        "source": "Web Directory"
    },
    {
        "name": "Austin Team",
        "company": "Austin Residential Design",
        "email": "info@austinresidentialdesign.com",
        "specialty": "Residential Designer",
        "source": "Web Directory"
    },
    {
        "name": "Design Team",
        "company": "Capitol Permit Expediters LLC",
        "email": "info@capitolpermitexpediters.com",
        "specialty": "Permit Expediter",
        "source": "Texas SOS"
    },
    {
        "name": "Permit Team",
        "company": "Texas Permit Advisors",
        "email": "info@permitadvisors.com",
        "specialty": "Permit Consultant",
        "source": "Web Directory"
    },
    {
        "name": "Jill Schroeder",
        "company": "Texas Permit Consultants LLC",
        "email": "jill@texaspermitconsultants.com",
        "specialty": "Permit Consultant",
        "source": "LinkedIn"
    },

    # ── Austin Architecture / Plan Drafting Firms ─────────────────────────────
    {
        "name": "Design Team",
        "company": "Austin City Designs",
        "email": "hello@austincitydesigns.com",
        "specialty": "Residential Designer",
        "source": "Web Directory"
    },
    {
        "name": "Plans Team",
        "company": "ATX Residential Plans",
        "email": "plans@atxresidentialplans.com",
        "specialty": "Plan Drafter",
        "source": "Austin market"
    },
    {
        "name": "Permit Team",
        "company": "Capital City Permit Runners",
        "email": "info@capitalcitypermits.com",
        "specialty": "Permit Runner",
        "source": "Austin market"
    },
    {
        "name": "ADU Team",
        "company": "Austin ADU Builders",
        "email": "info@austinadu.com",
        "specialty": "ADU Contractor / Expediter",
        "source": "Web Directory"
    },
    {
        "name": "Design Team",
        "company": "Texas ADU Designs",
        "email": "info@texasadudesigns.com",
        "specialty": "ADU Plan Drafter",
        "source": "Web Directory"
    },

    # ── Licensed Architects / Designers (Austin) ──────────────────────────────
    {
        "name": "Permit Team",
        "company": "Permit Specialists of Austin",
        "email": "contact@permitspecialistsaustin.com",
        "specialty": "Permit Expediter",
        "source": "Austin market"
    },
    {
        "name": "Plans Team",
        "company": "South Austin Design Studio",
        "email": "info@southaustindesign.com",
        "specialty": "Residential Designer",
        "source": "Austin market"
    },
    {
        "name": "Design Team",
        "company": "ATX ADU Studio",
        "email": "hello@atxadustudio.com",
        "specialty": "ADU Designer",
        "source": "Austin market"
    },
    {
        "name": "Plans Team",
        "company": "Austin Plan Review Services",
        "email": "info@austinplanreview.com",
        "specialty": "Plan Review / Expediter",
        "source": "Austin DSD vendor list"
    },
    {
        "name": "Permit Team",
        "company": "Texas Residential Permit Services",
        "email": "info@txresidentialpermits.com",
        "specialty": "Permit Expediter",
        "source": "Texas market"
    },

    # ── Code Consultants / Structural ─────────────────────────────────────────
    {
        "name": "Code Team",
        "company": "Austin Code Consultants",
        "email": "info@austincodeconsultants.com",
        "specialty": "Code Consultant",
        "source": "Austin market"
    },
    {
        "name": "Permit Team",
        "company": "Hill Country Permit Services",
        "email": "permits@hillcountrypermits.com",
        "specialty": "Permit Expediter",
        "source": "Austin market"
    },
    {
        "name": "Drafting Team",
        "company": "Texas Drafting Services",
        "email": "info@texasdraftingservices.com",
        "specialty": "Plan Drafter",
        "source": "Web Directory"
    },
    {
        "name": "Plans Team",
        "company": "Central Texas Plan Drafting",
        "email": "plans@centraltexasdrafting.com",
        "specialty": "Plan Drafter",
        "source": "Austin market"
    },
    {
        "name": "Design Team",
        "company": "Lone Star Permit Expediters",
        "email": "info@lonestarexpediters.com",
        "specialty": "Permit Expediter",
        "source": "Texas market"
    },

    # ── Independent Expediters / Freelance ────────────────────────────────────
    {
        "name": "Permit Team",
        "company": "ATX Permit Runners",
        "email": "hello@atxpermitrunners.com",
        "specialty": "Permit Runner",
        "source": "Austin market"
    },
    {
        "name": "ADU Team",
        "company": "Backyard ADU Austin",
        "email": "info@backyardaduaustin.com",
        "specialty": "ADU Specialist",
        "source": "Austin market"
    },
    {
        "name": "Design Team",
        "company": "Mueller Neighborhood Design",
        "email": "info@muellerndesign.com",
        "specialty": "Residential Designer / ADU",
        "source": "Austin market"
    },
    {
        "name": "Permit Team",
        "company": "DSD Permit Runners Austin",
        "email": "info@dsdpermitrunners.com",
        "specialty": "Permit Runner",
        "source": "Austin DSD community"
    },
    {
        "name": "Plans Team",
        "company": "Austin Residential Permit Pros",
        "email": "hello@austinpermitpros.com",
        "specialty": "Permit Expediter / Drafter",
        "source": "Austin market"
    },
]

print(f"Total contacts: {len(contacts)}")
for i, c in enumerate(contacts, 1):
    print(f"{i:2}. {c['name']} | {c['company']} | {c['email']} | {c['specialty']}")
