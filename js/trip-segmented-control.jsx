import {SegmentedRadioGroup} from '@gravity-ui/uikit';
export default function TripSegmentedControl({className='',...props}) {
  return <SegmentedRadioGroup size="l" width="max" {...props} className={'trip-segmented-control '+className}/>;
}
