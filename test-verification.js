// Simple test to check verification logic
const testContent = `donald john trump (born june 14, 1946) is an american politician, media personality, and businessman who served as the 45th president of the united states from 2017 to 2021. a member of the republican party, he served as the 47th president of the united states from 2025 to present.`;

const testClaim = "is donald trump the president of usa?";

// Test the verification logic
function testVerification() {
  const lowerContent = testContent.toLowerCase();
  const lowerClaim = testClaim.toLowerCase();
  const personName = "donald trump";
  const lowerPersonName = personName.toLowerCase();
  
  console.log('Testing verification for:', testClaim);
  console.log('Person name:', personName);
  console.log('Content includes person name:', lowerContent.includes(lowerPersonName));
  
  // Check for current position indicators
  const currentPositionPatterns = [
    /current.*president/i,
    /president.*of.*united.*states/i,
    /current.*prime.*minister/i,
    /current.*chancellor/i,
    /\d{4}.*presidential.*election.*won/i,
    /won.*\d{4}.*election/i,
    /inaugurated.*\d{4}/i,
    /current.*tenure/i,
    /\d+th.*president/i  // This should match "47th president"
  ];
  
  // Check if any current position pattern matches
  const hasCurrentPosition = currentPositionPatterns.some(pattern => {
    const matches = pattern.test(lowerContent);
    console.log('Pattern check:', { pattern: pattern.source, matches });
    return matches && lowerContent.includes(lowerPersonName);
  });
  
  // Check for specific position mentions near the person's name
  const positionKeywords = ['president', 'prime minister', 'chancellor'];
  const hasPositionMention = positionKeywords.some(position => {
    const hasPosition = lowerContent.includes(position) && lowerContent.includes(lowerPersonName);
    console.log('Position keyword check:', { position, hasPosition });
    return hasPosition;
  });
  
  const result = hasCurrentPosition || hasPositionMention;
  console.log('Final verification result:', {
    hasCurrentPosition,
    hasPositionMention,
    result
  });
  
  return result;
}

const result = testVerification();
console.log('\nFinal result:', result ? 'TRUE - Claim is supported' : 'FALSE - Claim is not supported'); 