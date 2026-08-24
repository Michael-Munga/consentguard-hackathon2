#!/usr/bin/env python3
"""
Synthetic Raw CSV Generator for KPC Inuka Fellowship Data Layer
Simulates messy, manual raw exports prior to Great Expectations ETL validation.
"""

import os
import sys
import argparse
import random
from datetime import datetime, timedelta
import pandas as pd

# Diverse and authentic Kenyan first and last names representing all communities
FIRST_NAMES = [
    'Amani', 'Baraka', 'Chebet', 'Desta', 'Eshiwani', 'Faraji', 'Gathoni',
    'Hakim', 'Imani', 'Jelani', 'Kariuki', 'Linet', 'Makena', 'Nekesa',
    'Otieno', 'Pendo', 'Raburu', 'Simiyu', 'Tatu', 'Wanjiru', 'Zawadi',
    'Koech', 'Moraa', 'Mutua', 'Kiprono', 'Kipchoge', 'Nyaboke', 'Cherono',
    'Brian', 'Faith', 'Kevin', 'Mercy', 'Emmanuel', 'Brenda', 'Dennis', 'Joyce',
    'Victor', 'Sharon', 'Collins', 'Winnie', 'Evans', 'Esther', 'Peter', 'Grace',
    'Samuel', 'Cynthia', 'Daniel', 'Beatrice', 'Kennedy', 'Maureen', 'Anthony', 'Lilian',
    'Stephen', 'Jackline', 'Joseph', 'Caroline', 'Patrick', 'Vivian', 'Kelvin', 'Peris',
    'Boniface', 'Diana', 'Erick', 'Damaris', 'Allan', 'Rosemary', 'Gideon', 'Purity',
    'Hassan', 'Fatuma', 'Abdi', 'Amina', 'Farah', 'Halima', 'Salim', 'Mwanaisha', 'Juma', 'Khadija',
    'Lemayian', 'Naisula', 'Saitoti', 'Sanayian', 'Senteu', 'Nashipae', 'Leshan', 'Resian',
    'Ekitela', 'Lokidor', 'Akiru', 'Nangiro', 'Lomechu', 'Amuron', 'Ekeno', 'Apeyon',
    'Kiprono', 'Chebet', 'Kipchoge', 'Cherono', 'Koech', 'Chepkirui', 'Kiplagat', 'Jepkemoi',
    'Otieno', 'Achieng', 'Ochieng', 'Akoth', 'Odhiambo', 'Atieno', 'Onyango', 'Adhiambo',
    'Mwangi', 'Wanjiru', 'Maina', 'Wambui', 'Kariuki', 'Njeri', 'Njoroge', 'Nyambura',
    'Wafula', 'Nekesa', 'Simiyu', 'Nasimiyu', 'Wekesa', 'Nafula', 'Barasa', 'Nanjala',
    'Mutua', 'Kavata', 'Mutiso', 'Mumbua', 'Musyoka', 'Mwende', 'Kioko', 'Syombua',
    'Moraa', 'Nyaboke', 'Omwamba', 'Kwamboka', 'Mogaka', 'Kerubo', 'Makori', 'Bikundo',
    'Murithi', 'Makena', 'Mwirigi', 'Kagwiria', 'Kirimi', 'Nkatha', 'Kinoti', 'Gakii'
]

LAST_NAMES = [
    'Kamau', 'Ouma', 'Cheruiyot', 'Mwangi', 'Odhiambo', 'Wekesa', 'Kipchoge',
    'Nyaboke', 'Juma', 'Kurgat', 'Njoroge', 'Ochieng', 'Rotich', 'Maina',
    'Karanja', 'Omondi', 'Kimani', 'Chepkemoi', 'Mutiso', 'Achieng', 'Onyango',
    'Ochieng', 'Mwangi', 'Wanjiku', 'Kipchumba', 'Nekesa', 'Otieno', 'Kamau', 'Cherono',
    'Mutua', 'Achieng', 'Njoroge', 'Chepkemoi', 'Wafula', 'Odhiambo', 'Maina', 'Kiplagat',
    'Wambui', 'Kiprono', 'Barasa', 'Nyambura', 'Ombati', 'Koech', 'Muthoni', "Ndung'u",
    'Juma', 'Adhiambo', 'Rotich', 'Kariuki', 'Kiptoo', 'Makori', 'Kurgat', 'Githinji',
    'Mohamed', 'Omar', 'Ali', 'Hussein', 'Bakari', 'Mwinyi', 'Abdalla', 'Abdirahman', 'Said', 'Khamis',
    'Ole Sankale', 'Syril', 'Kanyinke', 'Entito', 'Loontubu', 'Nkatha', 'Ntimama', 'Sironka',
    'Ekal', 'Ereng', 'Lokeris', 'Lokuruka', 'Ebei', 'Akiru', 'Nakure', 'Ekai',
    'Cheruiyot', 'Ruto', 'Koech', 'Bett', 'Kigen', 'Korir', 'Tanui', 'Kurgat',
    'Onyango', 'Okoth', 'Ouma', 'Omondi', 'Ogola', 'Owino', 'Okeyo', 'Ayot',
    'Karanja', 'Gathoni', 'Kimani', 'Waweru', 'Macharia', 'Wagura', 'Kinyua', 'Murage',
    'Wanyonyi', 'Shikuku', 'Khisa', 'Masinde', 'Kundu', 'Were', 'Namwamba', 'Luyali',
    'Musyoki', 'Kyalo', 'Muli', 'Mutisya', 'Nzomo', 'Kaloki', 'Mbithi', 'Mueni',
    'Kemunto', 'Mogere', 'Osoro', 'Ondieki', 'Gichana', 'Bosire', 'Mong\'ina', 'Nyamweya',
    'Mugambi', 'Kathambi', 'Micheni', 'Karani', 'Mutegi', 'Gacheri', 'Gitonga', 'Riungu'
]

# Canonical 47 Kenyan Counties mapped to 8 Regions
COUNTY_TO_REGION = {
    # Central (5)
    'Kiambu': 'Central',
    'Kirinyaga': 'Central',
    "Murang'a": 'Central',
    'Nyandarua': 'Central',
    'Nyeri': 'Central',
    # Coast (6)
    'Kilifi': 'Coast',
    'Kwale': 'Coast',
    'Lamu': 'Coast',
    'Mombasa': 'Coast',
    'Taita-Taveta': 'Coast',
    'Tana River': 'Coast',
    # Eastern (8)
    'Embu': 'Eastern',
    'Isiolo': 'Eastern',
    'Kitui': 'Eastern',
    'Machakos': 'Eastern',
    'Makueni': 'Eastern',
    'Marsabit': 'Eastern',
    'Meru': 'Eastern',
    'Tharaka-Nithi': 'Eastern',
    # Nairobi (1)
    'Nairobi': 'Nairobi',
    # North Eastern (3)
    'Garissa': 'North Eastern',
    'Mandera': 'North Eastern',
    'Wajir': 'North Eastern',
    # Nyanza (6)
    'Homa Bay': 'Nyanza',
    'Kisii': 'Nyanza',
    'Kisumu': 'Nyanza',
    'Migori': 'Nyanza',
    'Nyamira': 'Nyanza',
    'Siaya': 'Nyanza',
    # Rift Valley (14)
    'Baringo': 'Rift Valley',
    'Bomet': 'Rift Valley',
    'Elgeyo-Marakwet': 'Rift Valley',
    'Kajiado': 'Rift Valley',
    'Kericho': 'Rift Valley',
    'Laikipia': 'Rift Valley',
    'Nakuru': 'Rift Valley',
    'Nandi': 'Rift Valley',
    'Narok': 'Rift Valley',
    'Samburu': 'Rift Valley',
    'Trans-Nzoia': 'Rift Valley',
    'Turkana': 'Rift Valley',
    'Uasin Gishu': 'Rift Valley',
    'West Pokot': 'Rift Valley',
    # Western (4)
    'Bungoma': 'Western',
    'Busia': 'Western',
    'Kakamega': 'Western',
    'Vihiga': 'Western',
}

COUNTIES = list(COUNTY_TO_REGION.keys())
REGIONS = sorted(list(set(COUNTY_TO_REGION.values())))

VALID_PILLARS = ['Scholarship', 'Plus', 'Vocational', 'Tech']
VALID_PURPOSES = ['donor_reporting', 'internal_analytics', 'third_party_sharing']
VALID_STATUSES = ['requested', 'granted', 'revoked', 'expired']

def generate_synthetic_raw_export(num_rows: int = 5200, output_path: str = None) -> str:
    """Generates synthetic messy CSV export with deliberate, reproducible data quality defects."""
    random.seed(42)  # Deterministic seed for reproducible demo data
    
    base_date = datetime(2026, 1, 15)
    rows = []
    
    num_clean = max(0, num_rows - 10)
    
    # 1. Generate clean foundation rows (~5,190 rows)
    for i in range(num_clean):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        pillar = VALID_PILLARS[i % len(VALID_PILLARS)]
        county = COUNTIES[i % len(COUNTIES)]
        region = COUNTY_TO_REGION[county]
        purpose = random.choice(VALID_PURPOSES)
        status = random.choice(VALID_STATUSES)
        
        app_offset = random.randint(0, 180)
        app_dt = base_date + timedelta(days=app_offset, hours=random.randint(8, 17))
        app_date_str = app_dt.strftime('%Y-%m-%d %H:%M:%S')
        
        if status == 'granted':
            grant_offset = random.randint(1, 14)
            grant_dt = app_dt + timedelta(days=grant_offset, hours=random.randint(1, 5))
            grant_date_str = grant_dt.strftime('%Y-%m-%d %H:%M:%S')
        elif status in ('revoked', 'expired'):
            grant_offset = random.randint(1, 7)
            grant_dt = app_dt + timedelta(days=grant_offset)
            grant_date_str = grant_dt.strftime('%Y-%m-%d %H:%M:%S')
        else:
            grant_date_str = None
            
        rows.append({
            'beneficiary_name': name,
            'pillar': pillar,
            'county': county,
            'region': region,
            'application_date': app_date_str,
            'consent_purpose_requested': purpose,
            'consent_status': status,
            'consent_granted_date': grant_date_str,
        })

    # 2. Inject deliberate, specific data quality defects (Section 4 requirements)
    
    # Defect 1: At least 3 rows where consent_granted_date is EARLIER than application_date
    rows.append({
        'beneficiary_name': 'Kiprono Cheruiyot',
        'pillar': 'Scholarship',
        'county': 'Uasin Gishu',
        'region': 'Rift Valley',
        'application_date': '2026-03-20 10:30:00',
        'consent_purpose_requested': 'donor_reporting',
        'consent_status': 'granted',
        'consent_granted_date': '2026-01-10 09:15:00',  # 70 days BEFORE applied!
    })
    rows.append({
        'beneficiary_name': 'Wanjiru Kamau',
        'pillar': 'Tech',
        'county': 'Nairobi',
        'region': 'Nairobi',
        'application_date': '2026-04-12 14:00:00',
        'consent_purpose_requested': 'third_party_sharing',
        'consent_status': 'granted',
        'consent_granted_date': '2026-02-01 11:20:00',  # 70 days BEFORE applied!
    })
    rows.append({
        'beneficiary_name': 'Otieno Ouma',
        'pillar': 'Vocational',
        'county': 'Kisumu',
        'region': 'Nyanza',
        'application_date': '2026-05-01 08:45:00',
        'consent_purpose_requested': 'internal_analytics',
        'consent_status': 'granted',
        'consent_granted_date': '2026-03-15 16:30:00',  # 45 days BEFORE applied!
    })

    # Defect 2: At least 2 rows with missing / blank region or county
    rows.append({
        'beneficiary_name': 'Chebet Rotich',
        'pillar': 'Plus',
        'county': 'Nakuru',
        'region': None,  # Missing region!
        'application_date': '2026-02-18 11:10:00',
        'consent_purpose_requested': 'donor_reporting',
        'consent_status': 'granted',
        'consent_granted_date': '2026-02-22 14:00:00',
    })
    rows.append({
        'beneficiary_name': 'Mutua Mutiso',
        'pillar': 'Vocational',
        'county': '',  # Blank county!
        'region': 'Eastern',
        'application_date': '2026-03-05 13:20:00',
        'consent_purpose_requested': 'internal_analytics',
        'consent_status': 'requested',
        'consent_granted_date': None,
    })

    # Defect 3: At least 2 rows with invalid pillar value (typos / non-existent)
    rows.append({
        'beneficiary_name': 'Makena Karanja',
        'pillar': 'Scholarshp',  # Typo in pillar!
        'county': 'Meru',
        'region': 'Eastern',
        'application_date': '2026-02-10 09:30:00',
        'consent_purpose_requested': 'donor_reporting',
        'consent_status': 'granted',
        'consent_granted_date': '2026-02-12 10:00:00',
    })
    rows.append({
        'beneficiary_name': 'Faraji Juma',
        'pillar': 'AgriTech',  # Invalid pillar!
        'county': 'Mombasa',
        'region': 'Coast',
        'application_date': '2026-03-14 15:45:00',
        'consent_purpose_requested': 'third_party_sharing',
        'consent_status': 'requested',
        'consent_granted_date': None,
    })

    # Defect 4: At least 2 rows with missing consent_granted_date even though consent_status is 'granted'
    rows.append({
        'beneficiary_name': 'Nekesa Wekesa',
        'pillar': 'Plus',
        'county': 'Bungoma',
        'region': 'Western',
        'application_date': '2026-02-25 10:00:00',
        'consent_purpose_requested': 'donor_reporting',
        'consent_status': 'granted',
        'consent_granted_date': None,  # Missing date for granted consent!
    })
    rows.append({
        'beneficiary_name': 'Simiyu Omondi',
        'pillar': 'Scholarship',
        'county': 'Kakamega',
        'region': 'Western',
        'application_date': '2026-03-10 11:30:00',
        'consent_purpose_requested': 'internal_analytics',
        'consent_status': 'granted',
        'consent_granted_date': '',  # Blank date for granted consent!
    })

    # Defect 5: At least 1 duplicate beneficiary_name + application_date combination
    duplicate_entry = {
        'beneficiary_name': 'Zawadi Maina',
        'pillar': 'Tech',
        'county': 'Nairobi',
        'region': 'Nairobi',
        'application_date': '2026-03-01 09:00:00',
        'consent_purpose_requested': 'donor_reporting',
        'consent_status': 'granted',
        'consent_granted_date': '2026-03-03 14:00:00',
    }
    rows.append(duplicate_entry)
    rows.append(dict(duplicate_entry))  # Duplicate copy!

    df = pd.DataFrame(rows)
    
    # Target path
    if not output_path:
        today_str = datetime.now().strftime('%Y-%m-%d')
        raw_dir = os.path.join(os.path.dirname(__file__), 'raw_data')
        os.makedirs(raw_dir, exist_ok=True)
        output_path = os.path.join(raw_dir, f"inuka_beneficiary_export_{today_str}.csv")
        
    df.to_csv(output_path, index=False)
    print(f"[Generator] Synthetic raw export created at: {output_path} ({len(df)} rows total)")
    print(f"  - Clean baseline rows: {len(df) - 10}")
    print(f"  - Injected deliberate defects: 10 rows (3 temporal inversions, 2 missing regions, 2 invalid pillars, 2 missing grant dates, 1 duplicate)")
    return output_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate synthetic messy CSV for Inuka ETL validation")
    parser.add_argument('--count', type=int, default=5200, help="Total number of rows to generate")
    parser.add_argument('--output', type=str, default=None, help="Explicit destination file path")
    args = parser.parse_args()
    
    generate_synthetic_raw_export(num_rows=args.count, output_path=args.output)
