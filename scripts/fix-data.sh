#!/bin/bash
# Fix corrupted doctor data using bash + jq

DOCTORS_DIR="/Users/taps/Desktop/MDRPEDIA/mdrpedia/src/content/doctors"
TSV_FILE="/Users/taps/Desktop/MDRPEDIA/mdrpedia/src/data/pioneers_clean.tsv"

# Country mapping function (macOS bash 3 compatible)
map_country() {
    case "$1" in
        "USA") echo "United States" ;;
        "UK") echo "United Kingdom" ;;
        *) echo "$1" ;;
    esac
}

# Tier calculation
get_tier() {
    local hindex=$1
    if [ "$hindex" -ge 200 ]; then
        echo "TITAN"
    elif [ "$hindex" -ge 100 ]; then
        echo "ELITE"
    elif [ "$hindex" -ge 50 ]; then
        echo "MASTER"
    else
        echo "UNRANKED"
    fi
}

# Create slug from name
create_slug() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/\.//g' | sed "s/[^a-z0-9 -]//g" | sed 's/  */ /g' | sed 's/ /-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

updated=0
created=0
errors=0

# Skip header line, read TSV
tail -n +2 "$TSV_FILE" | while IFS='|' read -r rank name affiliation country hindex citations specialty; do
    # Clean up fields - remove leading/trailing whitespace without xargs
    name=$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    affiliation=$(echo "$affiliation" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    country=$(echo "$country" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    hindex=$(echo "$hindex" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    specialty=$(echo "$specialty" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Skip if missing required fields
    if [ -z "$name" ] || [ -z "$hindex" ]; then
        continue
    fi

    # Get mapped country
    mapped_country=$(map_country "$country")

    # Calculate tier and score
    tier=$(get_tier "$hindex")
    score=$(echo "scale=1; $hindex / 5" | bc)
    if (( $(echo "$score > 100" | bc -l) )); then
        score="100"
    fi

    # Create slug
    slug=$(create_slug "$name")
    filepath="$DOCTORS_DIR/${slug}.json"

    if [ -f "$filepath" ]; then
        # Update existing file
        tmp_file=$(mktemp)

        jq --arg name "$name" \
           --arg specialty "$specialty" \
           --argjson hindex "$hindex" \
           --arg tier "$tier" \
           --argjson score "$score" \
           --arg country "$mapped_country" \
           --arg affiliation "$affiliation" \
           --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" \
           '.fullName = $name |
            .specialty = $specialty |
            .hIndex = $hindex |
            .tier = $tier |
            .rankingScore = $score |
            .geography.country = $country |
            .medicalSpecialty = [$specialty] |
            .affiliations = [{"hospitalName": $affiliation, "role": "Faculty", "hospitalUrl": "#"}] |
            .lastFixedAt = $timestamp' \
           "$filepath" > "$tmp_file" 2>/dev/null

        if [ $? -eq 0 ] && [ -s "$tmp_file" ]; then
            mv "$tmp_file" "$filepath"
            echo "Updated: $name (H-index: $hindex, Tier: $tier)"
            ((updated++))
        else
            rm -f "$tmp_file"
            echo "Error updating: $name"
            ((errors++))
        fi
    else
        # Create new file
        cat > "$filepath" << JSONEOF
{
  "fullName": "$name",
  "slug": "$slug",
  "title": "MD",
  "specialty": "$specialty",
  "subSpecialty": null,
  "geography": {
    "country": "$mapped_country",
    "region": null,
    "city": null
  },
  "status": "LIVING",
  "tier": "$tier",
  "rankingScore": $score,
  "hIndex": $hindex,
  "yearsActive": 0,
  "verifiedSurgeries": 0,
  "livesSaved": 0,
  "biography": "$name is a leading specialist in $specialty at $affiliation.",
  "aiSummary": null,
  "techniquesInvented": [],
  "hasInvention": false,
  "portraitUrl": null,
  "galleryUrls": [],
  "npiNumber": null,
  "orcidId": null,
  "medicalSpecialty": ["$specialty"],
  "knowsAbout": [],
  "affiliations": [{"hospitalName": "$affiliation", "role": "Faculty", "hospitalUrl": "#"}],
  "citations": [],
  "awards": [],
  "timeline": [],
  "mentors": [],
  "students": [],
  "lastFixedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
}
JSONEOF
        echo "Created: $name (H-index: $hindex, Tier: $tier)"
        ((created++))
    fi
done

echo ""
echo "Fix complete!"
