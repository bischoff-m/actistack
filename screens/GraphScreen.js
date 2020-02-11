import React from 'react';
import {
    StyleSheet,
    SafeAreaView,
    Button,
    StatusBar,
    TouchableOpacity,
    View,
    Text,
    Alert,
    Modal,
    ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
// import DraggableFlatList from 'react-native-draggable-flatlist';

import globalStyles from '../styles/Styles';
import GraphItem from '../components/GraphItem';
import Tutorial from '../components/Tutorial';

class GraphScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showPicker: false,
            graphItems: [],
            firstItemTime: -1,
            statusBar: null,
            showTutorial: false
        }

        global.activityItems = {}
        global.insertAtTop = true

        // load state of showTutorial
        AsyncStorage.getItem("showTutorial").then((value) => {
            if(!value)
                value = true;
            this.setState({ showTutorial: value });
        });
        
        // load activityItems and graphItems and do update
        AsyncStorage.getItem("activityItems").then((items) => {
            if(!items)
                return;
            global.activityItems = JSON.parse(items);

            // add all graphItems to state
            AsyncStorage.getItem("graphItems").then((ids) => {
                if(!ids)
                    return;
                this.setState({ graphItems: JSON.parse(ids) });
            });

            AsyncStorage.getItem("firstItemTime").then((value) => {
                if(!value)
                    return;
                this.setState({ firstItemTime: parseInt(value) });
            });
        });
    }

    /* ################### TODO ###################
        - insert graphItems at chosen position
        - delete graphItems by swiping
        - ability to change order of graphItems
        - https://github.com/jshanson7/react-native-swipeable
        - https://kmagiera.github.io/react-native-gesture-handler/docs/component-swipeable.html
        - https://www.npmjs.com/package/react-native-draggable-flatlist
       ############################################ */

    static navigationOptions = ({ navigation }) => {
        return {
            title: "Schedule",
            headerRight: () => (
                <View style={{
                        flexDirection: "row",
                    }}>
                    <TouchableOpacity
                        onPress={navigation.getParam('onSwitchDirectionPress')}
                        style={{
                            width: 56,
                            height: 56,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Icon name={global.insertAtTop ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={navigation.getParam('onPressHeaderDelete')}
                        style={{
                            width: 56,
                            height: 56,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Icon name="delete" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={navigation.getParam('onPressHeaderAdd')}
                        style={{
                            width: 56,
                            height: 56,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Icon name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            ),
        }
    };

    componentDidMount() {
        // set status bar color to have the same color when app was reopened
        StatusBar.setBackgroundColor('#22283B');

        // set handler for header buttons
        this.props.navigation.setParams({
            onSwitchDirectionPress: () => {
                global.insertAtTop = !global.insertAtTop;
                this.componentDidMount();
            },
            onPressHeaderDelete: () => {
                Alert.alert(
                    'Delete Activities',
                    'All added activities will be deleted from the timetable.',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: "Delete",
                            onPress: () => {
                                this.state.graphItems = [];
                                this.state.firstItemTime = -1;
                                this.updateState();
                            },
                        },
                    ],
                    { cancelable: false },
                );
            },
            onPressHeaderAdd: () => {
                this.props.navigation.navigate('Activity', {
                    onItemSelected: this.onActivityItemSelected.bind(this),
                    updateParent: this.updateState.bind(this),
                });
            },
        });
    }

    // gets called when an item from ActivityScreen is selected
    onActivityItemSelected(id) {
        this.props.navigation.popToTop();
        if(this.state.graphItems.length === 0)
            this.state.firstItemTime = -1;
        
        // add selected item to graph items
        if(global.insertAtTop) {
            this.state.graphItems.unshift({ activityID: id });
        } else {
            this.state.graphItems.push({ activityID: id });
        }
        console.log(this.state.graphItems.length)
        // show time picker if its the first item or it has no duration
        if(this.state.graphItems.length === 1 || !global.activityItems[id].hasOwnProperty("duration")) {
            this.setState({ showPicker: true });
        } else {
            // dont show time picker
            if(global.insertAtTop)
                this.state.firstItemTime -= global.activityItems[id].duration * 60 * 1000;
            this.updateState();
        }
    }
    
    // gets called when time or duration is chosen using time picker
    // first picker chooses time to insert first graph item
    // second picker chooses duration of grpah item if not already given
    // A = time was chosen (false for cancelled alert)
    // B = is first graph item
    // C = graph contains item without duration prop
    // A    B   C
    // 1	1	0	set firstItemTime
    // 1	1	1	set firstItemTime
    // 0	1	0	clear graphItems
    // 0	1	1	clear graphItems
    // 1	0	1	set duration prop of graphItem
    // 0	0	1	remove item without duration prop
    // 1	0	0	do nothing
    // 0	0	0	do nothing
    onTimePickerDone(event, time) {
        let isTimeChosen = time !== null && time !== undefined; // A
        let isFirstItem = this.state.firstItemTime === -1 // B (TODO: maybe change this to graphItems.length === 1 to make it more robust)
        let hasItemWithoutDuration = false; // C
        // search for item without duration prop
        let itemWithoutDurationIndex = -1;
        for(let i = 0; i < this.state.graphItems.length; i++) {
            let activityItem = global.activityItems[this.state.graphItems[i].activityID];
            if(!activityItem.hasOwnProperty("duration") && !this.state.graphItems[i].hasOwnProperty("duration")) {
                itemWithoutDurationIndex = i;
                hasItemWithoutDuration = true;
            }
        }

        if(isFirstItem) {
            if(isTimeChosen) {
                this.state.firstItemTime = time.getTime();
                if(hasItemWithoutDuration)
                    this.setState({ showPicker: true });
            }
            else
                this.state.graphItems = [];
        } else if(hasItemWithoutDuration) {
            if(isTimeChosen) {
                let duration = time.getMinutes() + (time.getHours() * 60);
                this.state.graphItems[itemWithoutDurationIndex].duration = duration;
                if(global.insertAtTop && this.state.graphItems.length > 1)
                    this.state.firstItemTime -= duration * 60 * 1000;
            } else {
                this.state.graphItems.splice(itemWithoutDurationIndex, 1);
                if(this.state.graphItems.length == 0)
                    this.state.firstItemTime = -1;
            }
        }

        this.updateState();
    }

    // removes a graphItem and filles gap according to direction (global.insertAtTop)
    onGraphItemLongPress(index) {
        const { graphItems } = this.state;
        let graphItem = graphItems[index];
        let activityItem = global.activityItems[graphItem.activityID];
        // always keep time from base item (according to direction) unless it is deleted
        // if direction is up, shift time if index <= length - 1
        // if direction is down, shift time if index === 0
        if(global.insertAtTop)
            var doShift = index < graphItems.length - 1;
        else
            var doShift = index === 0;
        if(doShift) {
            if(activityItem.hasOwnProperty("duration"))
                this.state.firstItemTime += activityItem.duration * 60 * 1000;
            else if(graphItem.hasOwnProperty("duration"))
                this.state.firstItemTime += graphItem.duration * 60 * 1000;
        }

        graphItems.splice(index, 1);
        if(graphItems.length === 0)
            this.state.firstItemTime = -1;
        this.updateState();
    }
    
    // save state to storage and update screen
    updateState() {
        const { graphItems, firstItemTime } = this.state;
        
        // remove graphItems that were removed from activityItems
        for(let i = graphItems.length - 1; i >= 0; i--) {
            if(!global.activityItems.hasOwnProperty(graphItems[i].activityID)) {
                graphItems.splice(i, 1);
                continue;
            }
        }
        if(graphItems.length === 0)
            this.state.firstItemTime = -1;

        AsyncStorage.setItem("graphItems", JSON.stringify(graphItems));
        AsyncStorage.setItem("firstItemTime", JSON.stringify(firstItemTime));
        this.setState({ showPicker: false });
    }

    render() {
        const { graphItems, showPicker, firstItemTime, showTutorial } = this.state;
        const { navigation } = this.props;
        
        // create graph component for each entry in state array
        let graphComponents = [];
        let currentTime = firstItemTime;

        // insert graphComponent
        for(let i = 0; i < graphItems.length; i++) {
            let id = graphItems[i].activityID;
            let time = currentTime;
            let duration = -1;

            // increment currentTime
            if(global.activityItems[id].hasOwnProperty("duration")) {
                currentTime += global.activityItems[id].duration * 60 * 1000;
            } else if(graphItems[i].hasOwnProperty("duration")) {
                duration = graphItems[i].duration;
                currentTime += graphItems[i].duration * 60 * 1000;
            } else {
                graphComponents.splice(0, 1);
            }
            
            graphComponents.push(
                <GraphItem
                    key={i}
                    id={id} 
                    time={time}
                    onLongPress={this.onGraphItemLongPress.bind(this, i)}
                    duration={duration} />
            );
        }

        return (
            <>
                <StatusBar barStyle='light-content' backgroundColor='#22283B' />
                <SafeAreaView style={globalStyles.body}>
                    { // Graph
                        graphItems.length > 0 && firstItemTime > 0 &&
                        <View style={styles.graphContainer}>
                            { graphComponents }
                        </View>
                    }
                    { // First activity button
                        graphItems.length === 0 &&
                        <TouchableOpacity style={globalStyles.centered} onPress={() => {
                                navigation.navigate('Activity', {
                                    onItemSelected: this.onActivityItemSelected.bind(this),
                                    updateParent: this.updateState.bind(this),
                                });
                            }}>
                            <Icon name="add-circle-outline" size={80} color="white" />
                            <Text style={{color: "white", lineHeight: 30}}>Add your first Activity!</Text>
                        </TouchableOpacity>
                    }
                    { // Time picker
                        showPicker &&
                        <DateTimePicker
                            value={new Date(0)}
                            mode={"time"}
                            is24Hour={true}
                            display={"clock"}
                            onChange={this.onTimePickerDone.bind(this)} />
                    }
                    { // Tutorial modal
                        <Modal visible={showTutorial}>
                            <ScrollView style={styles.tutorialModal}>
                                <View>
                                    <Text style={styles.text}>
                                        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
                                        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
                                        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
                                        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
                                    </Text>
                                </View>
                            </ScrollView>
                        </Modal>
                    }
                </SafeAreaView>
            </>
        );
    }
};

const styles = StyleSheet.create({
    graphContainer: {
        flex: 1,
        margin: 30,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        overflow: "hidden",
    },
    addButton: {
        position: "absolute",
        width: 56,
        height: 56,
        right: 20,
        bottom: 20,
        borderRadius: 28,
        backgroundColor: "#009688",
        justifyContent: "center",
        alignItems: "center",
    },
    tutorialModal: {
        // position: "absolute",
        backgroundColor: "#22283B",
        // top: 0,
        // bottom: 0,
        // left: 0,
        // right: 0,
        padding: 20,
        // alignItems: "center",
        // justifyContent: "center",
    },
    text: {
        color: "white",
        fontSize: 20,
        textAlign: "center"
    }
});

export default GraphScreen;

// TODO: add swipeable screen
// https://github.com/leecade/react-native-swiper
// 5.
// https://blogs.adobe.com/creativecloud/onboarding-the-what-when-and-how-of-app-walkthroughs/